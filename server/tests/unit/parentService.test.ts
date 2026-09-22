import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ParentService } from "../../src/services/parentService";
import { RuleBasedProvider } from "../../src/providers/ai/RuleBasedProvider";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createParentUser, createStudentUser, createSubject } from "../helpers/fixtures";

describe("ParentService — ownership isolation (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("throws 403 when parent does not own the requested student", async () => {
    const { parent: parentA } = await createParentUser();
    const { parent: parentB } = await createParentUser();
    const { student } = await createStudentUser({ parentId: parentB.id });

    const service = new ParentService();

    await expect(service.getChildDashboard(parentA.id, student.id, "uz")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("allows access when ownership is confirmed", async () => {
    const { parent } = await createParentUser();
    const { student, user } = await createStudentUser({ parentId: parent.id, fullName: "Test Student", grade: 9 });

    const service = new ParentService();
    const result = await service.getChildDashboard(parent.id, student.id, "uz");

    expect(result.fullName).toBe(user.fullName);
    expect(result.grade).toBe(9);
    expect(result.dailyTrend).toEqual([]);
    expect(result.quizHistory).toEqual([]);
  });

  it("includes the daily activity trend and quiz history alongside the summary fields", async () => {
    const { parent } = await createParentUser();
    const { student } = await createStudentUser({ parentId: parent.id, grade: 9 });
    const subject = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });

    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    oldDate.setHours(0, 0, 0, 0);
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    recentDate.setHours(0, 0, 0, 0);

    await prisma.progress.createMany({
      data: [
        { studentId: student.id, date: oldDate, studyMinutes: 40 },
        { studentId: student.id, date: recentDate, studyMinutes: 25 },
      ],
    });
    await prisma.quizResult.create({
      data: {
        studentId: student.id,
        subjectId: subject.id,
        grade: 9,
        score: 88,
        level: "STRONG",
        attemptDate: recentDate,
      },
    });

    const service = new ParentService();
    const result = await service.getChildDashboard(parent.id, student.id, "uz");

    // weeklyStudyMinutes only sums the last 7 days, even though dailyTrend covers the full 30-day window.
    expect(result.weeklyStudyMinutes).toBe(25);
    expect(result.dailyTrend).toHaveLength(2);
    expect(result.quizHistory).toMatchObject([{ subjectCode: "MATH", subjectName: "Matematika", score: 88 }]);
  });
});

describe("ParentService.generateReport — quiz-only activity isn't reported as '0 daqiqa' (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("doesn't claim '0 daqiqa shug'ullandi' when the student has no timed sessions but did take quizzes this week", async () => {
    const { parent } = await createParentUser();
    const { student } = await createStudentUser({ parentId: parent.id, fullName: "Bekzod Toshev", grade: 9 });
    const subject = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });

    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    recentDate.setHours(0, 0, 0, 0);
    await prisma.quizResult.create({
      data: { studentId: student.id, subjectId: subject.id, grade: 9, score: 56, level: "MEDIUM", attemptDate: recentDate },
    });

    const service = new ParentService(new RuleBasedProvider());
    const report = await service.generateReport(parent.id, student.id, "uz");

    expect(report.summary).not.toContain("0 daqiqa shug'ullandi");
    expect(report.summary).toContain("56");
    expect(report.summary).toContain("1 ta test");
  });

  it("still reports real timed minutes normally when they exist", async () => {
    const { parent } = await createParentUser();
    const { student } = await createStudentUser({ parentId: parent.id, grade: 9 });
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    recentDate.setHours(0, 0, 0, 0);
    await prisma.progress.create({ data: { studentId: student.id, date: recentDate, studyMinutes: 45 } });

    const service = new ParentService(new RuleBasedProvider());
    const report = await service.generateReport(parent.id, student.id, "uz");

    expect(report.summary).toContain("45 daqiqa shug'ullandi");
  });

  it("counts real quiz-session minutes toward the weekly total, not just '0 daqiqa'", async () => {
    const { parent } = await createParentUser();
    const { student } = await createStudentUser({ parentId: parent.id, grade: 9 });
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    recentDate.setHours(0, 0, 0, 0);
    // Mirrors what quizService actually writes: Progress.studyMinutes stays 0
    // (avoids double-counting completedTasks) while the real elapsed time
    // lands on a QUIZ-sourced StudySession row instead.
    await prisma.progress.create({ data: { studentId: student.id, date: recentDate, studyMinutes: 0, completedTasks: 1 } });
    await prisma.studySession.create({
      data: {
        studentId: student.id,
        startedAt: recentDate,
        completedAt: recentDate,
        minutes: 8,
        seconds: 480,
        status: "COMPLETED",
        source: "QUIZ",
      },
    });

    const service = new ParentService(new RuleBasedProvider());
    const report = await service.generateReport(parent.id, student.id, "uz");

    expect(report.summary).toContain("8 daqiqa shug'ullandi");
    expect(report.summary).not.toContain("vaqt belgilamagan");
  });
});
