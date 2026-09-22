import { PrismaClient } from "@prisma/client";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class ConsistencyRepository {
  constructor(private db: PrismaClient) {}

  findLatest(studentId: string) {
    return this.db.consistencyScore.findFirst({
      where: { studentId },
      orderBy: { periodEnd: "desc" },
    });
  }

  progressInRange(studentId: string, periodStart: Date, periodEnd: Date) {
    return this.db.progress.findMany({
      where: { studentId, date: { gte: periodStart, lte: periodEnd } },
      orderBy: { date: "asc" },
    });
  }

  create(
    studentId: string,
    periodStart: Date,
    periodEnd: Date,
    score: number,
    activeDays: number,
    plannedDays: number,
    completedDays: number
  ) {
    return this.db.consistencyScore.create({
      data: { studentId, periodStart: startOfDay(periodStart), periodEnd: startOfDay(periodEnd), score, activeDays, plannedDays, completedDays },
    });
  }
}
