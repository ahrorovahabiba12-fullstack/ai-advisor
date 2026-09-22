import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { DailyCoachService } from "../../src/services/dailyCoachService";
import { GamificationRepository } from "../../src/repositories/gamificationRepository";
import { GamificationService } from "../../src/services/gamificationService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject, startOfDay } from "../helpers/fixtures";

// The AI provider stays a spy even though everything else here is real: the
// real MockAIProvider returns a fixed, input-independent message, which
// would silently defeat these tests' actual purpose — proving weakSubjects/
// grade/streak are assembled correctly from real DB rows before being
// handed to the provider.
describe("DailyCoachService (real DB)", () => {
  const ai = { generateDailyCoachMessage: vi.fn() };

  function makeService() {
    const gamificationRepo = new GamificationRepository(prisma);
    return new DailyCoachService(ai as any, undefined, undefined, gamificationRepo, new GamificationService(gamificationRepo));
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(() => prisma.$disconnect());

  it("returns today's message without calling the AI again if one was already generated today", async () => {
    const { student } = await createStudentUser();
    await prisma.dailyCoach.create({
      data: { studentId: student.id, coachDate: startOfDay(), message: "already generated", recommendedActions: [], lang: "uz" },
    });

    const result = await makeService().getToday(student.id, "uz");

    expect(result).toMatchObject({ message: "already generated" });
    expect(ai.generateDailyCoachMessage).not.toHaveBeenCalled();
  });

  it("generates and persists a new message (with weak subjects + streak context) when none exists yet today", async () => {
    const { student } = await createStudentUser({ grade: 8, fullName: "Aziz" });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const motherLang = await createSubject({ code: "MOTHER_LANG", nameUz: "Ona tili", nameRu: "Родной язык" });
    await prisma.subjectLevel.createMany({
      data: [
        { studentId: student.id, subjectId: math.id, level: "WEAK", score: 30, source: "test" },
        { studentId: student.id, subjectId: motherLang.id, level: "STRONG", score: 90, source: "test" },
      ],
    });
    // 3 consecutive days of Progress (today back to 2 days ago) -> currentStreak() === 3.
    const day = (offset: number) => {
      const d = startOfDay();
      d.setDate(d.getDate() - offset);
      return d;
    };
    await prisma.progress.createMany({
      data: [0, 1, 2].map((offset) => ({ studentId: student.id, date: day(offset), studyMinutes: 20 })),
    });
    ai.generateDailyCoachMessage.mockResolvedValue({ message: "Salom, Aziz!", recommendedActions: ["Matematika o'qing"] });

    const result = await makeService().getToday(student.id, "uz");

    expect(ai.generateDailyCoachMessage).toHaveBeenCalledWith(
      expect.objectContaining({ studentName: "Aziz", grade: 8, weakSubjects: ["Matematika"], currentStreak: 3 })
    );
    expect(result).toMatchObject({ message: "Salom, Aziz!" });
    const saved = await prisma.dailyCoach.findMany({ where: { studentId: student.id } });
    expect(saved).toHaveLength(1);
  });

  it("regenerates (does not reuse) when today's cached message exists but was generated in a different language", async () => {
    const { student } = await createStudentUser({ grade: 8, fullName: "Aziz" });
    // findForDate is itself language-scoped — a "uz" row on the same day must not
    // satisfy a "ru" request; a fresh generation in Russian must happen instead.
    await prisma.dailyCoach.create({
      data: { studentId: student.id, coachDate: startOfDay(), message: "Salom, Aziz!", recommendedActions: [], lang: "uz" },
    });
    ai.generateDailyCoachMessage.mockResolvedValue({ message: "Привет, Aziz!", recommendedActions: [] });

    const result = await makeService().getToday(student.id, "ru");

    expect(ai.generateDailyCoachMessage).toHaveBeenCalledWith(expect.objectContaining({ lang: "ru" }));
    expect(result).toMatchObject({ message: "Привет, Aziz!", lang: "ru" });
    const saved = await prisma.dailyCoach.findMany({ where: { studentId: student.id } });
    expect(saved).toHaveLength(2);
  });

  describe("a stale 'let's start today' message is regenerated once the student becomes active today", () => {
    it("regenerates (in place, same row) when the cached message predates today's activity", async () => {
      const { student } = await createStudentUser({ fullName: "Habiba" });
      const cached = await prisma.dailyCoach.create({
        data: {
          studentId: student.id,
          coachDate: startOfDay(),
          message: "Kecha tanaffus qildingiz — bugun qayta boshlaylik.",
          recommendedActions: ["15 daqiqa bilan boshlang"],
          lang: "uz",
          wasActiveWhenGenerated: false,
        },
      });
      // The student then completes something today, same as a real quiz submission would.
      await prisma.progress.create({ data: { studentId: student.id, date: startOfDay(), completedTasks: 1, studyMinutes: 0 } });
      ai.generateDailyCoachMessage.mockResolvedValue({ message: "Ajoyib! Bugun allaqachon boshladingiz.", recommendedActions: [] });

      const result = await makeService().getToday(student.id, "uz");

      expect(ai.generateDailyCoachMessage).toHaveBeenCalledWith(expect.objectContaining({ activeToday: true }));
      expect(result.message).toBe("Ajoyib! Bugun allaqachon boshladingiz.");
      expect(result.activeToday).toBe(true);
      // Same row updated in place, not a second row created.
      const rows = await prisma.dailyCoach.findMany({ where: { studentId: student.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(cached.id);
    });

    it("does NOT regenerate when the cached message already matches today's (still inactive) state", async () => {
      const { student } = await createStudentUser({ fullName: "Aziz" });
      await prisma.dailyCoach.create({
        data: {
          studentId: student.id,
          coachDate: startOfDay(),
          message: "cached, still valid",
          recommendedActions: [],
          lang: "uz",
          wasActiveWhenGenerated: false,
        },
      });

      const result = await makeService().getToday(student.id, "uz");

      expect(ai.generateDailyCoachMessage).not.toHaveBeenCalled();
      expect(result.message).toBe("cached, still valid");
    });
  });

  describe("isNewStudent — distinct from studiedYesterday=false", () => {
    it("is true for a brand-new student with no activity ever recorded", async () => {
      const { student } = await createStudentUser({ fullName: "Habiba" });
      ai.generateDailyCoachMessage.mockResolvedValue({ message: "Xush kelibsiz!", recommendedActions: [] });

      await makeService().getToday(student.id, "uz");

      expect(ai.generateDailyCoachMessage).toHaveBeenCalledWith(
        expect.objectContaining({ isNewStudent: true, studiedYesterday: false })
      );
    });

    it("is false for a student who has activity from before yesterday, even though they didn't study yesterday specifically", async () => {
      const { student } = await createStudentUser({ fullName: "Aziz" });
      const longAgo = startOfDay();
      longAgo.setDate(longAgo.getDate() - 5);
      await prisma.progress.create({ data: { studentId: student.id, date: longAgo, studyMinutes: 20 } });
      ai.generateDailyCoachMessage.mockResolvedValue({ message: "Salom!", recommendedActions: [] });

      await makeService().getToday(student.id, "uz");

      expect(ai.generateDailyCoachMessage).toHaveBeenCalledWith(
        expect.objectContaining({ isNewStudent: false, studiedYesterday: false })
      );
    });
  });

  describe("activeToday — derived from real Progress data, never self-reported", () => {
    it("is true when today's Progress row exists (a genuine quiz-triggered Schedule completion happened today)", async () => {
      const { student } = await createStudentUser();
      await prisma.dailyCoach.create({
        data: { studentId: student.id, coachDate: startOfDay(), message: "cached", recommendedActions: [], lang: "uz" },
      });
      await prisma.progress.create({ data: { studentId: student.id, date: startOfDay(), studyMinutes: 10 } });

      const result = await makeService().getToday(student.id, "uz");

      expect(result.activeToday).toBe(true);
    });

    it("is false when there is no Progress row for today yet", async () => {
      const { student } = await createStudentUser();
      await prisma.dailyCoach.create({
        data: { studentId: student.id, coachDate: startOfDay(), message: "cached", recommendedActions: [], lang: "uz" },
      });
      const yesterday = startOfDay();
      yesterday.setDate(yesterday.getDate() - 1);
      await prisma.progress.create({ data: { studentId: student.id, date: yesterday, studyMinutes: 10 } });

      const result = await makeService().getToday(student.id, "uz");

      expect(result.activeToday).toBe(false);
    });

    it("is included even on the freshly-generated (not-yet-cached) path", async () => {
      const { student } = await createStudentUser();
      await prisma.progress.create({ data: { studentId: student.id, date: startOfDay(), studyMinutes: 10 } });
      ai.generateDailyCoachMessage.mockResolvedValue({ message: "Salom!", recommendedActions: [] });

      const result = await makeService().getToday(student.id, "uz");

      expect(result.activeToday).toBe(true);
    });
  });
});
