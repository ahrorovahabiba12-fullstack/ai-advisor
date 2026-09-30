import { SubjectLevelEnum } from "@prisma/client";
import { QuizRepository } from "../repositories/quizRepository";
import { GamificationService } from "./gamificationService";
import { ScheduleService } from "./scheduleService";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/prisma";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";
import { weightedSampleWithoutReplacement } from "../utils/weightedSample";

const levelFromScore = (score: number): SubjectLevelEnum => {
  if (score >= 80) return "STRONG";
  if (score >= 50) return "MEDIUM";
  return "WEAK";
};

// How many questions a single quiz attempt shows, drawn (weighted) from the
// full pool for that subject/grade — a pool larger than this is what gives
// the adaptive re-selection below any room to actually vary.
const QUIZ_LENGTH = 5;
// Relative selection weights, keyed by the student's own most recent
// outcome on that exact question: missed last time -> favored to reappear
// soon; got it right -> still possible ("kamdan-kam" = rarely), never
// permanently excluded; never attempted -> plain baseline.
const WEIGHT_NEVER_ATTEMPTED = 2;
const WEIGHT_WRONG_LAST_TIME = 4;
const WEIGHT_CORRECT_LAST_TIME = 1;

export class QuizService {
  constructor(
    private repo = new QuizRepository(prisma),
    private gamification = new GamificationService(),
    private scheduleService = new ScheduleService()
  ) {}

  /** Returns questions WITHOUT correctIndex — the client never sees answers. */
  async startQuiz(studentId: string, subjectId: string, grade: number, lang: Lang) {
    const pool = await this.repo.findQuestionPool(subjectId, grade);
    if (pool.length === 0) {
      throw AppError.notFound("Bu fan va sinf uchun testlar hali qo'shilmagan");
    }

    const recentAttempts = await this.repo.findRecentAttempts(studentId, pool.map((q) => q.id));
    const lastOutcomeByQuestion = new Map<string, boolean>();
    for (const a of recentAttempts) {
      // recentAttempts is ordered most-recent-first — keep only the first
      // (= latest) outcome seen per question.
      if (!lastOutcomeByQuestion.has(a.questionId)) lastOutcomeByQuestion.set(a.questionId, a.correct);
    }
    const weights = pool.map((q) => {
      const last = lastOutcomeByQuestion.get(q.id);
      if (last === undefined) return WEIGHT_NEVER_ATTEMPTED;
      return last ? WEIGHT_CORRECT_LAST_TIME : WEIGHT_WRONG_LAST_TIME;
    });
    const questions = weightedSampleWithoutReplacement(pool, weights, QUIZ_LENGTH);

    // Best-effort: if today's schedule has a TODO task for this subject, starting a quiz
    // on it is exactly the "studying this subject" signal — move it to IN_PROGRESS
    // automatically. A schedule-linking failure must never block the quiz itself.
    try {
      await this.scheduleService.autoTransitionForSubject(studentId, subjectId, "IN_PROGRESS");
    } catch {
      /* non-critical side effect — quiz continues regardless */
    }

    return {
      questions: questions.map((q) => ({
        id: q.id,
        text: pick(q.text, q.textRu, lang),
        options: lang === "ru" && q.optionsRu.length === q.options.length ? q.optionsRu : q.options,
      })),
      // Echoed back on submit so the real start-to-submit duration can be recorded —
      // see autoTransitionForSubject's elapsedSeconds, which needs this even when no
      // Schedule item ever gets a StudySession of its own (e.g. subjects outside today's plan).
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * answers: [{questionId, selectedIndex}]. Score is computed server-side;
   * a wrong client-declared score is never trusted. startedAt (from startQuiz's
   * response) is used to compute the real time spent, when the client supplies it.
   */
  async submitQuiz(
    studentId: string,
    subjectId: string,
    grade: number,
    answers: { questionId: string; selectedIndex: number }[],
    lang: Lang,
    startedAt?: string
  ) {
    const questions = await this.repo.findQuestionsByIds(answers.map((a) => a.questionId));
    if (questions.length !== answers.length) {
      throw AppError.badRequest("Ba'zi savollar topilmadi");
    }
    // findQuestionsByIds looks questions up by id alone — without this check a
    // client could submit real question ids from one subject/grade while
    // declaring a different subjectId/grade, and that (wrong) subject's
    // QuizResult/SubjectLevel would silently get scored from someone else's
    // question pool. Every fetched question must genuinely belong to the
    // subject/grade the request claims.
    if (questions.some((q) => q.subjectId !== subjectId || q.grade !== grade)) {
      throw AppError.badRequest("Savollar tanlangan fan yoki sinfga mos kelmaydi");
    }

    const questionById = new Map(questions.map((q) => [q.id, q]));
    const attemptRecords = answers.map((a) => ({
      questionId: a.questionId,
      correct: questionById.get(a.questionId)?.correctIndex === a.selectedIndex,
    }));
    const correctCount = attemptRecords.filter((a) => a.correct).length;
    const score = Math.round((correctCount / answers.length) * 100);
    const level = levelFromScore(score);

    // Result + subject-level + today's progress + per-question attempt history
    // (feeds the adaptive selection in startQuiz) must land together.
    const [result] = await prisma.$transaction([
      prisma.quizResult.create({
        data: { studentId, subjectId, grade, score, level, attemptDate: new Date() },
      }),
      prisma.subjectLevel.upsert({
        where: { studentId_subjectId: { studentId, subjectId } },
        create: { studentId, subjectId, level, score, source: "quiz" },
        update: { level, score, source: "quiz" },
      }),
      prisma.progress.upsert({
        where: { studentId_date: { studentId, date: startOfToday() } },
        create: { studentId, date: startOfToday(), completedTasks: 1, studyMinutes: 0, scoreDelta: score },
        update: { completedTasks: { increment: 1 }, scoreDelta: { increment: score } },
      }),
      prisma.questionAttempt.createMany({
        data: attemptRecords.map((a) => ({ studentId, questionId: a.questionId, correct: a.correct })),
      }),
    ]);

    const newBadges = await this.gamification.evaluateAfterQuiz(studentId);

    // Same best-effort auto-transition as startQuiz — mirrors the manual "Tugatdim"
    // flow, but deliberately does NOT credit Progress again here: the $transaction
    // above already credited completedTasks/scoreDelta for this exact real-world
    // action (solving this subject's problems), so ScheduleService.autoTransitionForSubject
    // only updates status/StudySession, never Progress, avoiding a double-count.
    try {
      const elapsedSeconds = startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
        : undefined;
      await this.scheduleService.autoTransitionForSubject(studentId, subjectId, "COMPLETED", score, elapsedSeconds);
    } catch {
      /* non-critical side effect — quiz result still stands regardless */
    }

    // Correctness is revealed only now, AFTER submission — never while the quiz is in
    // progress. This is a post-hoc review, not a way to see answers before answering.
    const review = answers.map((a) => {
      const q = questionById.get(a.questionId)!;
      const options = lang === "ru" && q.optionsRu.length === q.options.length ? q.optionsRu : q.options;
      return {
        questionId: a.questionId,
        text: pick(q.text, q.textRu, lang),
        options,
        selectedIndex: a.selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect: a.selectedIndex === q.correctIndex,
      };
    });

    return { score, level, correctCount, total: answers.length, resultId: result.id, newBadges, review };
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
