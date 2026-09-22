import { PrismaClient } from "@prisma/client";

export class ProgressRepository {
  constructor(private db: PrismaClient) {}

  findRange(studentId: string, since: Date) {
    return this.db.progress.findMany({
      where: { studentId, date: { gte: since } },
      orderBy: { date: "asc" },
    });
  }

  quizScoresSince(studentId: string, since: Date) {
    return this.db.quizResult.findMany({
      where: { studentId, attemptDate: { gte: since } },
      include: { subject: true },
      orderBy: { attemptDate: "asc" },
    });
  }

  subjectLevelTrend(studentId: string) {
    return this.db.subjectLevel.findMany({ where: { studentId }, include: { subject: true } });
  }
}
