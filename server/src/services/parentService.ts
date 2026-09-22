import { getAIProvider } from "../providers/ai";
import { StudentRepository } from "../repositories/studentRepository";
import { ParentReportRepository } from "../repositories/parentReportRepository";
import { ProgressRepository } from "../repositories/progressRepository";
import { StudySessionRepository } from "../repositories/studySessionRepository";
import { GamificationService } from "./gamificationService";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

const DASHBOARD_TREND_DAYS = 30;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Progress.studyMinutes is 0 for quiz-driven days by design (avoids double-
// counting with completedTasks) — this adds the real quiz time back in so the
// parent-facing weekly minutes/trend reflect actual engagement, not just timed
// schedule sessions. See progressService.getOverview for the same fix.
function quizMinutesByDay(sessions: { completedAt: Date | null; minutes: number }[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const s of sessions) {
    if (!s.completedAt) continue;
    const key = startOfDay(s.completedAt).getTime();
    map.set(key, (map.get(key) ?? 0) + s.minutes);
  }
  return map;
}

export class ParentService {
  constructor(
    private ai = getAIProvider(),
    private studentRepo = new StudentRepository(prisma),
    private reportRepo = new ParentReportRepository(prisma),
    private progressRepo = new ProgressRepository(prisma),
    private studySessionRepo = new StudySessionRepository(prisma),
    private gamification = new GamificationService()
  ) {}

  async listChildren(parentId: string) {
    return this.studentRepo.findByParentId(parentId);
  }

  private async assertOwnership(parentId: string, studentId: string) {
    const owned = await this.studentRepo.belongsToParent(studentId, parentId);
    if (!owned) throw AppError.forbidden("Bu farzand sizga tegishli emas");
  }

  async getChildDashboard(parentId: string, studentId: string, lang: Lang) {
    await this.assertOwnership(parentId, studentId);
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendSince = new Date(Date.now() - DASHBOARD_TREND_DAYS * 24 * 60 * 60 * 1000);
    const [progress, quizResults, streak, quizSessions] = await Promise.all([
      this.progressRepo.findRange(studentId, trendSince),
      this.progressRepo.quizScoresSince(studentId, trendSince),
      this.gamification.currentStreak(studentId),
      this.studySessionRepo.findCompletedQuizSessions(studentId, trendSince),
    ]);

    const quizMinutes = quizMinutesByDay(quizSessions);
    const realMinutes = (p: { date: Date; studyMinutes: number }) =>
      p.studyMinutes + (quizMinutes.get(startOfDay(p.date).getTime()) ?? 0);

    const weeklyMinutes = progress.filter((p) => p.date >= weekAgo).reduce((sum, p) => sum + realMinutes(p), 0);

    return {
      fullName: student.user.fullName,
      grade: student.grade,
      streakDays: streak,
      weeklyStudyMinutes: weeklyMinutes,
      dailyTrend: progress.map((p) => ({ date: p.date, studyMinutes: realMinutes(p) })),
      quizHistory: quizResults.map((q) => ({
        subjectCode: q.subject.code,
        subjectName: pick(q.subject.nameUz, q.subject.nameRu, lang),
        score: q.score,
        attemptDate: q.attemptDate,
      })),
      strongSubjects: student.subjectLevels
        .filter((s) => s.level === "STRONG")
        .map((s) => pick(s.subject.nameUz, s.subject.nameRu, lang)),
      attentionAreas: student.subjectLevels
        .filter((s) => s.level === "WEAK")
        .map((s) => pick(s.subject.nameUz, s.subject.nameRu, lang)),
    };
  }

  async generateReport(parentId: string, studentId: string, lang: Lang) {
    await this.assertOwnership(parentId, studentId);
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [progress, quizResults, quizSessions] = await Promise.all([
      this.progressRepo.findRange(studentId, since),
      this.progressRepo.quizScoresSince(studentId, since),
      this.studySessionRepo.findCompletedQuizSessions(studentId, since),
    ]);

    const quizMinutes = quizMinutesByDay(quizSessions);
    const weeklyStudyMinutes = progress.reduce(
      (sum, p) => sum + p.studyMinutes + (quizMinutes.get(startOfDay(p.date).getTime()) ?? 0),
      0
    );
    const quizAverage =
      quizResults.length > 0 ? quizResults.reduce((s, q) => s + q.score, 0) / quizResults.length : 0;

    // AI never sees or produces raw chat transcripts here — only aggregate,
    // parent-appropriate metrics go into the prompt (see spec: no raw AI chat to parent).
    const output = await this.ai.generateParentReport({
      lang,
      studentName: student.user.fullName,
      grade: student.grade,
      weeklyStudyMinutes,
      quizAverage,
      quizCount: quizResults.length,
      streakDays: await this.gamification.currentStreak(studentId),
      strongSubjects: student.subjectLevels
        .filter((s) => s.level === "STRONG")
        .map((s) => pick(s.subject.nameUz, s.subject.nameRu, lang)),
      weakSubjects: student.subjectLevels
        .filter((s) => s.level === "WEAK")
        .map((s) => pick(s.subject.nameUz, s.subject.nameRu, lang)),
    });

    await this.reportRepo.save(parentId, studentId, output.summary, output);
    return output;
  }
}
