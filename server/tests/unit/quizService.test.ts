import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { QuizService } from "../../src/services/quizService";
import { QuizRepository } from "../../src/repositories/quizRepository";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject } from "../helpers/fixtures";

// gamification/scheduleService stay spies — these tests specifically assert
// on cross-service side-effect wiring (exact call args, resilience when a
// side effect throws), which real DB rows can't observe as directly as a
// spy can. The quiz repository + the $transaction that actually persists
// the result are real, against the test DB.
describe("QuizService — server-side scoring (real DB)", () => {
  const gamification = { evaluateAfterQuiz: vi.fn().mockResolvedValue([]) };
  const scheduleService = { autoTransitionForSubject: vi.fn().mockResolvedValue(undefined) };

  function makeService() {
    return new QuizService(new QuizRepository(prisma), gamification as any, scheduleService as any);
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    gamification.evaluateAfterQuiz.mockResolvedValue([]);
    scheduleService.autoTransitionForSubject.mockResolvedValue(undefined);
  });
  afterAll(() => prisma.$disconnect());

  it("never sends correctIndex to the client when starting a quiz", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "2+2=?", textRu: "2+2=?", options: ["3", "4", "5", "6"], optionsRu: ["3", "4", "5", "6"], correctIndex: 1 },
    });

    const { questions } = await makeService().startQuiz(student.id, subject.id, 8, "uz");

    expect(questions).toHaveLength(1);
    expect(questions[0]).not.toHaveProperty("correctIndex");
    expect(questions[0]).toMatchObject({ text: "2+2=?", options: ["3", "4", "5", "6"] });
  });

  it("auto-transitions today's matching schedule item(s) to IN_PROGRESS when a quiz starts", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "t", textRu: "t", options: [], optionsRu: [], correctIndex: 0 },
    });

    await makeService().startQuiz(student.id, subject.id, 8, "uz");

    expect(scheduleService.autoTransitionForSubject).toHaveBeenCalledWith(student.id, subject.id, "IN_PROGRESS");
  });

  it("still returns questions even if the schedule auto-transition fails (non-critical side effect)", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "t", textRu: "t", options: [], optionsRu: [], correctIndex: 0 },
    });
    scheduleService.autoTransitionForSubject.mockRejectedValueOnce(new Error("boom"));

    const { questions } = await makeService().startQuiz(student.id, subject.id, 8, "uz");

    expect(questions).toHaveLength(1);
  });

  it("computes score from actual correctIndex regardless of what the client claims", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    const q1 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
    });
    const q2 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "b", textRu: "b", options: [], optionsRu: [], correctIndex: 0 },
    });

    const result = await makeService().submitQuiz(
      student.id,
      subject.id,
      8,
      [
        { questionId: q1.id, selectedIndex: 1 }, // correct
        { questionId: q2.id, selectedIndex: 3 }, // wrong
      ],
      "uz"
    );

    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(50);
    const saved = await prisma.quizResult.findUnique({ where: { id: result.resultId } });
    expect(saved).toMatchObject({ studentId: student.id, subjectId: subject.id, score: 50 });
  });

  it("auto-transitions today's matching schedule item(s) to COMPLETED on submit, passing the real score and lang, without asking ScheduleService to credit Progress again", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    const q1 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
    });

    await makeService().submitQuiz(student.id, subject.id, 8, [{ questionId: q1.id, selectedIndex: 1 }], "ru");

    expect(scheduleService.autoTransitionForSubject).toHaveBeenCalledWith(student.id, subject.id, "COMPLETED", 100, "ru", undefined);
  });

  it("computes and passes real elapsed seconds to autoTransitionForSubject when the client echoes back startQuiz's startedAt", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    const q1 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
    });
    const startedAt = new Date(Date.now() - 8000).toISOString(); // 8 seconds ago

    await makeService().submitQuiz(student.id, subject.id, 8, [{ questionId: q1.id, selectedIndex: 1 }], "uz", startedAt);

    expect(scheduleService.autoTransitionForSubject).toHaveBeenCalledTimes(1);
    const call = scheduleService.autoTransitionForSubject.mock.calls[0];
    expect(call[0]).toBe(student.id);
    expect(call[1]).toBe(subject.id);
    expect(call[2]).toBe("COMPLETED");
    expect(call[5]).toBeGreaterThanOrEqual(7);
    expect(call[5]).toBeLessThanOrEqual(10);
  });

  it("still returns the quiz result even if the schedule auto-transition fails on submit", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const subject = await createSubject();
    const q1 = await prisma.question.create({
      data: { subjectId: subject.id, grade: 8, text: "a", textRu: "a", options: [], optionsRu: [], correctIndex: 1 },
    });
    scheduleService.autoTransitionForSubject.mockRejectedValueOnce(new Error("boom"));

    const result = await makeService().submitQuiz(student.id, subject.id, 8, [{ questionId: q1.id, selectedIndex: 1 }], "uz");

    expect(result.score).toBe(100);
  });

  describe("post-submission review — correctness revealed only after the fact", () => {
    it("includes a per-question review with the correct answer and whether the student got it right", async () => {
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "2+2=?", textRu: "2+2=?", options: ["3", "4"], optionsRu: ["3", "4"], correctIndex: 1 },
      });
      const q2 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "3+3=?", textRu: "3+3=?", options: ["5", "6"], optionsRu: ["5", "6"], correctIndex: 1 },
      });

      const result = await makeService().submitQuiz(
        student.id,
        subject.id,
        8,
        [
          { questionId: q1.id, selectedIndex: 1 }, // correct
          { questionId: q2.id, selectedIndex: 0 }, // wrong
        ],
        "uz"
      );

      expect(result.review).toEqual([
        { questionId: q1.id, text: "2+2=?", options: ["3", "4"], selectedIndex: 1, correctIndex: 1, isCorrect: true },
        { questionId: q2.id, text: "3+3=?", options: ["5", "6"], selectedIndex: 0, correctIndex: 1, isCorrect: false },
      ]);
    });

    it("localizes the review text and options for Russian", async () => {
      const { student } = await createStudentUser({ grade: 8 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 8, text: "2+2=?", textRu: "Сколько 2+2?", options: ["3", "4"], optionsRu: ["три", "четыре"], correctIndex: 1 },
      });

      const result = await makeService().submitQuiz(student.id, subject.id, 8, [{ questionId: q1.id, selectedIndex: 1 }], "ru");

      expect(result.review[0]).toMatchObject({ text: "Сколько 2+2?", options: ["три", "четыре"] });
    });
  });

  describe("adaptive question selection — wrong answers resurface more often", () => {
    it("records a QuestionAttempt row per answer on submit, with the real correctness", async () => {
      const { student } = await createStudentUser({ grade: 9 });
      const subject = await createSubject();
      const q1 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 9, text: "a", textRu: "a", options: ["x", "y"], optionsRu: ["x", "y"], correctIndex: 0 },
      });
      const q2 = await prisma.question.create({
        data: { subjectId: subject.id, grade: 9, text: "b", textRu: "b", options: ["x", "y"], optionsRu: ["x", "y"], correctIndex: 0 },
      });

      await makeService().submitQuiz(
        student.id,
        subject.id,
        9,
        [
          { questionId: q1.id, selectedIndex: 0 }, // correct
          { questionId: q2.id, selectedIndex: 1 }, // wrong
        ],
        "uz"
      );

      const attempts = await prisma.questionAttempt.findMany({ where: { studentId: student.id } });
      expect(attempts).toHaveLength(2);
      expect(attempts.find((a) => a.questionId === q1.id)?.correct).toBe(true);
      expect(attempts.find((a) => a.questionId === q2.id)?.correct).toBe(false);
    });

    it("selects a question missed last time noticeably more often than one answered correctly last time", async () => {
      const { student } = await createStudentUser({ grade: 9 });
      const subject = await createSubject();
      // A large pool relative to the 5-question quiz length makes selection
      // frequency actually sensitive to weight (a pool close to 5 would
      // include nearly everything regardless of weight).
      const questions = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.question.create({
            data: { subjectId: subject.id, grade: 9, text: `q${i}`, textRu: `q${i}`, options: ["x", "y"], optionsRu: ["x", "y"], correctIndex: 0 },
          })
        )
      );
      const wrongQuestion = questions[0];
      const correctQuestion = questions[1];
      await prisma.questionAttempt.create({ data: { studentId: student.id, questionId: wrongQuestion.id, correct: false } });
      await prisma.questionAttempt.create({ data: { studentId: student.id, questionId: correctQuestion.id, correct: true } });

      const ROUNDS = 200;
      let wrongCount = 0;
      let correctCount = 0;
      for (let i = 0; i < ROUNDS; i++) {
        const { questions: picked } = await makeService().startQuiz(student.id, subject.id, 9, "uz");
        const ids = new Set(picked.map((q) => q.id));
        if (ids.has(wrongQuestion.id)) wrongCount++;
        if (ids.has(correctQuestion.id)) correctCount++;
      }

      // Weight ratio is 4:1 (wrong:correct) — over 200 rounds the gap should be
      // unmistakable, well clear of any plausible sampling noise.
      expect(wrongCount).toBeGreaterThan(correctCount * 1.5);
    });
  });
});
