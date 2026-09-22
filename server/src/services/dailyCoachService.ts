import { getAIProvider } from "../providers/ai";
import { DailyCoachRepository } from "../repositories/dailyCoachRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { GamificationRepository } from "../repositories/gamificationRepository";
import { GamificationService } from "./gamificationService";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

export class DailyCoachService {
  constructor(
    private ai = getAIProvider(),
    private repo = new DailyCoachRepository(prisma),
    private studentRepo = new StudentRepository(prisma),
    private gamificationRepo = new GamificationRepository(prisma),
    private gamification = new GamificationService(gamificationRepo)
  ) {}

  async getToday(studentId: string, lang: Lang) {
    const today = new Date();
    // "Active today" is derived from real Progress data (itself only ever credited by a
    // genuine quiz-triggered Schedule completion) — never a manual, unverifiable claim.
    const recent = await this.gamificationRepo.recentProgressDates(studentId, 2);
    const activeToday = recent.some((p) => p.date.toDateString() === today.toDateString());

    // Cache key is (student, date, lang) — switching the UI language on the same day
    // must get a fresh message in that language, not a stale one from earlier today.
    // But a cached message written BEFORE the student did anything today (e.g. "let's
    // start today") goes stale the moment they complete something — re-showing it next
    // to a "done today" badge would read as a flat contradiction, so that transition
    // (false -> true) forces a regeneration instead of reusing the morning's message.
    const existing = await this.repo.findForDate(studentId, today, lang);
    if (existing && existing.wasActiveWhenGenerated === activeToday) {
      return { ...existing, activeToday };
    }

    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");

    const weakSubjects = student.subjectLevels
      .filter((s) => s.level === "WEAK")
      .map((s) => pick(s.subject.nameUz, s.subject.nameRu, lang));

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const studiedYesterday = recent.some((p) => p.date.toDateString() === yesterday.toDateString());
    const currentStreak = await this.gamification.currentStreak(studentId);
    const isNewStudent = !(await this.gamificationRepo.hasEverBeenActive(studentId));

    const generated = await this.ai.generateDailyCoachMessage({
      lang,
      studentName: student.user.fullName,
      grade: student.grade,
      weakSubjects,
      currentStreak,
      studiedYesterday,
      isNewStudent,
      activeToday,
    });

    const saved = existing
      ? await this.repo.update(existing.id, generated.message, generated.recommendedActions, activeToday)
      : await this.repo.create(studentId, today, generated.message, generated.recommendedActions, lang, activeToday);
    return { ...saved, activeToday };
  }
}
