import { getAIProvider } from "../providers/ai";
import { ProgressRepository } from "../repositories/progressRepository";
import { StudySessionRepository } from "../repositories/studySessionRepository";
import { prisma } from "../config/prisma";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class ProgressService {
  constructor(
    private ai = getAIProvider(),
    private repo = new ProgressRepository(prisma),
    private studySessionRepo = new StudySessionRepository(prisma)
  ) {}

  async getOverview(studentId: string, lang: Lang, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [progress, quizzes, levels, quizSessions] = await Promise.all([
      this.repo.findRange(studentId, since),
      this.repo.quizScoresSince(studentId, since),
      this.repo.subjectLevelTrend(studentId),
      this.studySessionRepo.findCompletedQuizSessions(studentId, since),
    ]);

    // Progress.studyMinutes is 0 for quiz-driven days by design (avoids double-
    // counting with completedTasks) — add the real quiz time back in here so
    // daily/weekly activity views reflect actual engagement, not just timed
    // schedule sessions.
    const quizMinutesByDay = new Map<number, number>();
    for (const s of quizSessions) {
      if (!s.completedAt) continue;
      const key = startOfDay(s.completedAt).getTime();
      quizMinutesByDay.set(key, (quizMinutesByDay.get(key) ?? 0) + s.minutes);
    }

    return {
      daily: progress.map((p) => ({
        date: p.date,
        studyMinutes: p.studyMinutes + (quizMinutesByDay.get(startOfDay(p.date).getTime()) ?? 0),
        completedTasks: p.completedTasks,
      })),
      quizHistory: quizzes.map((q) => ({
        subjectCode: q.subject.code,
        subjectName: pick(q.subject.nameUz, q.subject.nameRu, lang),
        score: q.score,
        attemptDate: q.attemptDate,
      })),
      subjectLevels: levels.map((l) => ({
        subjectCode: l.subject.code,
        subjectName: pick(l.subject.nameUz, l.subject.nameRu, lang),
        level: l.level,
        score: l.score,
      })),
    };
  }

  async analyzeWithAI(studentId: string, lang: Lang) {
    const overview = await this.getOverview(studentId, lang, 30);
    const weeklyMinutes = bucketByWeek(overview.daily);
    const quizScores = overview.quizHistory.map((q) => q.score);
    // Trend = current score minus the average of everything before it, per subject.
    const trends = overview.subjectLevels.map((s) => ({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      delta: s.score - 50,
    }));

    return this.ai.analyzeProgress({ lang, weeklyStudyMinutes: weeklyMinutes, quizScores, subjectTrends: trends });
  }
}

function bucketByWeek(daily: { date: Date; studyMinutes: number }[]): number[] {
  const buckets = new Map<number, number>();
  for (const d of daily) {
    const week = Math.floor(d.date.getTime() / (7 * 24 * 60 * 60 * 1000));
    buckets.set(week, (buckets.get(week) ?? 0) + d.studyMinutes);
  }
  return [...buckets.values()];
}
