import { PrismaClient, SubjectLevelEnum } from "@prisma/client";

export class QuizRepository {
  constructor(private db: PrismaClient) {}

  /** Every question available for this subject/grade — selection/weighting happens in QuizService. */
  findQuestionPool(subjectId: string, grade: number) {
    return this.db.question.findMany({ where: { subjectId, grade } });
  }

  /**
   * Most recent attempt per question first (ordered desc) — the caller keeps
   * only the first occurrence per questionId to get each question's latest
   * correct/wrong outcome for this student.
   */
  findRecentAttempts(studentId: string, questionIds: string[]) {
    return this.db.questionAttempt.findMany({
      where: { studentId, questionId: { in: questionIds } },
      orderBy: { attemptedAt: "desc" },
      select: { questionId: true, correct: true },
    });
  }

  findQuestionsByIds(ids: string[]) {
    return this.db.question.findMany({ where: { id: { in: ids } } });
  }

  saveResult(data: {
    studentId: string;
    subjectId: string;
    grade: number;
    score: number;
    level: SubjectLevelEnum;
    attemptDate: Date;
  }) {
    return this.db.quizResult.create({ data });
  }

  upsertSubjectLevel(studentId: string, subjectId: string, level: SubjectLevelEnum, score: number) {
    return this.db.subjectLevel.upsert({
      where: { studentId_subjectId: { studentId, subjectId } },
      create: { studentId, subjectId, level, score, source: "quiz" },
      update: { level, score, source: "quiz" },
    });
  }
}
