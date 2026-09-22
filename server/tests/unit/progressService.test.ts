import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ProgressService } from "../../src/services/progressService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser } from "../helpers/fixtures";

describe("ProgressService.getOverview — quiz-only days show real activity, not a flat 0 (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  it("adds real quiz-session minutes on top of a day whose Progress.studyMinutes is 0 by design", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const today = startOfDay(new Date());
    // Mirrors quizService.submitQuiz exactly: studyMinutes stays 0, completedTasks
    // is credited, and the real elapsed time lands on a QUIZ-sourced StudySession.
    await prisma.progress.create({ data: { studentId: student.id, date: today, studyMinutes: 0, completedTasks: 1 } });
    await prisma.studySession.create({
      data: {
        studentId: student.id,
        startedAt: today,
        completedAt: today,
        minutes: 4,
        seconds: 240,
        status: "COMPLETED",
        source: "QUIZ",
      },
    });

    const overview = await new ProgressService().getOverview(student.id, "uz");

    expect(overview.daily).toHaveLength(1);
    expect(overview.daily[0]).toMatchObject({ studyMinutes: 4, completedTasks: 1 });
  });

  it("doesn't double-count a timed schedule session's minutes", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const today = startOfDay(new Date());
    // A normal timed-session completion: Progress already holds the credited
    // planned minutes; its StudySession is SCHEDULE-sourced (the default) and
    // must never be added again on top.
    await prisma.progress.create({ data: { studentId: student.id, date: today, studyMinutes: 30, completedTasks: 1 } });
    await prisma.studySession.create({
      data: { studentId: student.id, startedAt: today, completedAt: today, minutes: 28, seconds: 1680, status: "COMPLETED" },
    });

    const overview = await new ProgressService().getOverview(student.id, "uz");

    expect(overview.daily[0].studyMinutes).toBe(30);
  });

  it("combines both sources on a day with a timed session AND a quiz", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const today = startOfDay(new Date());
    await prisma.progress.create({ data: { studentId: student.id, date: today, studyMinutes: 20, completedTasks: 2 } });
    await prisma.studySession.create({
      data: { studentId: student.id, startedAt: today, completedAt: today, minutes: 20, seconds: 1200, status: "COMPLETED" },
    });
    await prisma.studySession.create({
      data: {
        studentId: student.id,
        startedAt: today,
        completedAt: today,
        minutes: 5,
        seconds: 300,
        status: "COMPLETED",
        source: "QUIZ",
      },
    });

    const overview = await new ProgressService().getOverview(student.id, "uz");

    expect(overview.daily[0].studyMinutes).toBe(25);
  });
});
