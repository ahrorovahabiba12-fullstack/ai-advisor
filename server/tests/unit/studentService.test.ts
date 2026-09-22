import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { StudentService } from "../../src/services/studentService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject } from "../helpers/fixtures";

describe("StudentService.getDashboardSummary — todaySubjectCount (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("counts each distinct subject only once even with multiple quiz attempts today", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    await prisma.quizResult.createMany({
      data: [
        { studentId: student.id, subjectId: math.id, grade: 9, score: 60, level: "MEDIUM", attemptDate: new Date() },
        { studentId: student.id, subjectId: math.id, grade: 9, score: 90, level: "STRONG", attemptDate: new Date() },
      ],
    });

    const summary = await new StudentService().getDashboardSummary(student.id);

    expect(summary.todaySubjectCount).toBe(1);
  });

  it("does not count a quiz attempt from a previous day", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.quizResult.create({
      data: { studentId: student.id, subjectId: math.id, grade: 9, score: 60, level: "MEDIUM", attemptDate: yesterday },
    });

    const summary = await new StudentService().getDashboardSummary(student.id);

    expect(summary.todaySubjectCount).toBe(0);
  });

  it("counts multiple distinct subjects attempted today", async () => {
    const { student } = await createStudentUser();
    const subjects = await Promise.all([1, 2, 3, 4, 5].map((i) => createSubject({ code: `SUBJ${i}` })));
    await prisma.quizResult.createMany({
      data: subjects.map((s) => ({
        studentId: student.id,
        subjectId: s.id,
        grade: 9,
        score: 70,
        level: "MEDIUM" as const,
        attemptDate: new Date(),
      })),
    });

    const summary = await new StudentService().getDashboardSummary(student.id);

    expect(summary.todaySubjectCount).toBe(5);
  });
});
