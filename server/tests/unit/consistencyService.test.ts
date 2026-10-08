import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ConsistencyService } from "../../src/services/consistencyService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, startOfDay } from "../helpers/fixtures";

describe("ConsistencyService (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("recomputes fresh every call instead of trusting a stale same-day snapshot, but upserts (never duplicates) that day's row", async () => {
    const { student } = await createStudentUser();
    const today = startOfDay();
    // A snapshot already exists for today, written before any real activity happened.
    await prisma.consistencyScore.create({
      data: { studentId: student.id, periodStart: today, periodEnd: today, score: 0, activeDays: 0, plannedDays: 30, completedDays: 0 },
    });
    // Real activity happens after that stale snapshot was written.
    await prisma.progress.create({
      data: { studentId: student.id, date: today, studyMinutes: 30, completedTasks: 1 },
    });

    const result = await new ConsistencyService().getScore(student.id);

    expect(result).toMatchObject({ activeDays: 1 });
    expect(result.score).toBeGreaterThan(0);
    const all = await prisma.consistencyScore.findMany({ where: { studentId: student.id } });
    expect(all).toHaveLength(1);
  });

  it("recomputes from the last 30 days of Progress when no snapshot exists yet", async () => {
    const { student } = await createStudentUser();
    const day = (offset: number) => {
      const d = startOfDay();
      d.setDate(d.getDate() - offset);
      return d;
    };
    await prisma.progress.createMany({
      data: [
        { studentId: student.id, date: day(2), studyMinutes: 30, completedTasks: 2 },
        { studentId: student.id, date: day(1), studyMinutes: 0, completedTasks: 0 },
        { studentId: student.id, date: day(0), studyMinutes: 45, completedTasks: 0 },
      ],
    });

    const result = await new ConsistencyService().getScore(student.id);

    // 2 of 3 seeded days have studyMinutes > 0 -> activeDays: 2; 1 day has completedTasks > 0.
    expect(result).toMatchObject({ activeDays: 2, plannedDays: 30, completedDays: 1 });
    expect(result.score).toBeCloseTo((2 / 30) * 100, 1);
    const saved = await prisma.consistencyScore.findMany({ where: { studentId: student.id } });
    expect(saved).toHaveLength(1);
  });

  it("counts a quiz-only day (completedTasks > 0, studyMinutes still 0) as active", async () => {
    const { student } = await createStudentUser();
    const day = (offset: number) => {
      const d = startOfDay();
      d.setDate(d.getDate() - offset);
      return d;
    };
    await prisma.progress.createMany({
      data: [
        { studentId: student.id, date: day(1), studyMinutes: 0, completedTasks: 1 }, // quiz taken, no timed session
        { studentId: student.id, date: day(0), studyMinutes: 0, completedTasks: 0 }, // genuinely inactive day
      ],
    });

    const result = await new ConsistencyService().getScore(student.id);

    expect(result).toMatchObject({ activeDays: 1 });
  });

  it("recomputes when the cached snapshot is from an earlier day (not just when missing)", async () => {
    const { student } = await createStudentUser();
    const yesterday = startOfDay();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.consistencyScore.create({
      data: { studentId: student.id, periodStart: yesterday, periodEnd: yesterday, score: 10, activeDays: 1, plannedDays: 30, completedDays: 1 },
    });

    await new ConsistencyService().getScore(student.id);

    const all = await prisma.consistencyScore.findMany({ where: { studentId: student.id } });
    expect(all).toHaveLength(2);
  });
});
