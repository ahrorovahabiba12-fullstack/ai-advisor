import { z } from "zod";
import { env } from "../../config/env";
import {
  AIProvider,
  CareerRecommendationInput,
  CareerRecommendationOutput,
  ChatContext,
  ChatMessageInput,
  DailyCoachInput,
  DailyCoachOutput,
  LearningPlanInput,
  LearningPlanOutput,
  LearningRecommendationInput,
  LearningRecommendationOutput,
  ParentReportInput,
  ParentReportOutput,
  ProgressAnalysisInput,
  ProgressAnalysisOutput,
} from "./AIProvider";
import {
  CAREER_RECOMMENDATION_PROMPT_V1,
  CHAT_SYSTEM_PROMPT_V1,
  DAILY_COACH_PROMPT_V1,
  LEARNING_RECOMMENDATION_PROMPT_V1,
  PARENT_REPORT_PROMPT_V1,
} from "../../prompts";

const dailyCoachSchema = z.object({
  message: z.string(),
  recommendedActions: z.array(z.string()),
});

const learningRecSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      subjectCode: z.string(),
      reason: z.string(),
      minutesPerWeek: z.number().positive(),
      priority: z.number().int().positive(),
    })
  ),
  confidence: z.number().min(0).max(1),
});

const careerRecSchema = z.object({
  careers: z.array(
    z.object({ careerCode: z.string(), matchScore: z.number().min(0).max(1), reasoning: z.string() })
  ),
});

// The model is asked for a 0-1 decimal but real responses sometimes use a
// 0-100 percentage scale instead (e.g. 85 for "85%") despite the prompt —
// normalize that common case before validating, instead of rejecting the
// entire response (and silently losing every career in it to the fallback)
// over a scale mismatch that isn't actually bad data.
function normalizeMatchScores(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { careers?: unknown }).careers)) return raw;
  const careers = (raw as { careers: unknown[] }).careers.map((c) => {
    if (!c || typeof c !== "object") return c;
    const entry = c as { matchScore?: unknown };
    return typeof entry.matchScore === "number" && entry.matchScore > 1
      ? { ...entry, matchScore: entry.matchScore / 100 }
      : entry;
  });
  return { ...raw, careers };
}

const parentReportSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  attentionAreas: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

/**
 * Real OpenAI-backed implementation. Every response goes through:
 * raw text -> JSON.parse -> zod schema validation, before it is trusted.
 * Throws on any failure — callers (RecommendationService, etc.) wrap this
 * provider with a fallback so a malformed AI response never reaches the DB.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  // No `temperature` override here — the configured model (gpt-5.6-luna, a
  // cost-optimized reasoning-family model) only accepts its default value (1)
  // and rejects any other value with a 400.
  private async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  }

  private parseJson<T>(raw: string, schema: z.ZodType<T>, normalize?: (parsed: unknown) => unknown): T {
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    const parsed = JSON.parse(cleaned);
    return schema.parse(normalize ? normalize(parsed) : parsed);
  }

  async getLearningRecommendation(input: LearningRecommendationInput): Promise<LearningRecommendationOutput> {
    const prompt = LEARNING_RECOMMENDATION_PROMPT_V1(input);
    const raw = await this.complete("You are a JSON-only API. Respond with valid JSON only.", prompt);
    return this.parseJson(raw, learningRecSchema);
  }

  async getCareerRecommendation(input: CareerRecommendationInput): Promise<CareerRecommendationOutput> {
    const prompt = CAREER_RECOMMENDATION_PROMPT_V1(input);
    const raw = await this.complete("You are a JSON-only API. Respond with valid JSON only.", prompt);
    return this.parseJson(raw, careerRecSchema, normalizeMatchScores);
  }

  async generateParentReport(input: ParentReportInput): Promise<ParentReportOutput> {
    const prompt = PARENT_REPORT_PROMPT_V1(input);
    const raw = await this.complete("You are a JSON-only API. Respond with valid JSON only.", prompt);
    return this.parseJson(raw, parentReportSchema);
  }

  async generateLearningPlan(input: LearningPlanInput): Promise<LearningPlanOutput> {
    const weakNames = input.weakSubjects.map((s) => s.name).join(",");
    const strongNames = input.strongSubjects.map((s) => s.name).join(",");
    const neutralNames = input.neutralSubjects.map((s) => s.name).join(",");
    const langLine =
      input.lang === "ru" ? "Barcha matnlarni rus tilida yoz." : "Barcha matnlarni o'zbek tilida yoz.";
    const prompt = `Grade ${input.grade}. Weak: ${weakNames}. Strong: ${strongNames}. Neutral (untested, everyday-useful): ${neutralNames}. Minutes/day: ${input.availableMinutesPerDay}. Plan a 7-day week. Weak subjects should appear noticeably more often than strong ones. Most days should include a second, shorter block (~20 min) from a neutral or strong subject, so the week covers more than just 1-2 subjects — don't limit the whole week to only the weak/strong subjects. Multiple entries with the same dayOfWeek are allowed and expected. ${langLine} Return JSON: {"days":[{"dayOfWeek":number,"subjectCode":string,"minutes":number,"title":string}]}`;
    const raw = await this.complete("You are a JSON-only API. Respond with valid JSON only.", prompt);
    return this.parseJson(
      raw,
      z.object({
        days: z.array(
          z.object({ dayOfWeek: z.number(), subjectCode: z.string(), minutes: z.number(), title: z.string() })
        ),
      })
    );
  }

  async chat(context: ChatContext, history: ChatMessageInput[], userMessage: string): Promise<string> {
    const system = CHAT_SYSTEM_PROMPT_V1(context);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_API_KEY}` },
      body: JSON.stringify({
        model: env.AI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          ...history.map((h) => ({ role: h.role === "USER" ? "user" : "assistant", content: h.content })),
          { role: "user", content: userMessage },
        ],
        // See complete() above — the configured model only accepts the default temperature.
      }),
    });
    if (!res.ok) throw new Error(`OpenAI chat failed: ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  }

  async analyzeProgress(input: ProgressAnalysisInput): Promise<ProgressAnalysisOutput> {
    const langLine =
      input.lang === "ru" ? "Barcha matnlarni rus tilida yoz." : "Barcha matnlarni o'zbek tilida yoz.";
    const prompt = `Weekly minutes: ${JSON.stringify(input.weeklyStudyMinutes)}. Quiz scores: ${JSON.stringify(
      input.quizScores
    )}. Subject trends: ${JSON.stringify(input.subjectTrends)}. ${langLine} Return JSON: {"improvement":string,"weakPoints":string[],"nextSteps":string[]}`;
    const raw = await this.complete("You are a JSON-only API. Respond with valid JSON only.", prompt);
    return this.parseJson(
      raw,
      z.object({ improvement: z.string(), weakPoints: z.array(z.string()), nextSteps: z.array(z.string()) })
    );
  }

  async generateDailyCoachMessage(input: DailyCoachInput): Promise<DailyCoachOutput> {
    const prompt = DAILY_COACH_PROMPT_V1(input);
    const raw = await this.complete("You are a JSON-only API. Respond with valid JSON only.", prompt);
    return this.parseJson(raw, dailyCoachSchema);
  }
}
