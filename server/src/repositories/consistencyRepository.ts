import { PrismaClient } from "@prisma/client";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class ConsistencyRepository {
  constructor(private db: PrismaClient) {}

  progressInRange(studentId: string, periodStart: Date, periodEnd: Date) {
    return this.db.progress.findMany({
      where: { studentId, date: { gte: periodStart, lte: periodEnd } },
      orderBy: { date: "asc" },
    });
  }

  // Upsert, not create — getScore() recomputes on every call now (no more
  // same-day cache staleness), and without a day-keyed upsert that would
  // insert a fresh row on every single page load. It also closes a real race:
  // Progress.tsx fires /consistency and /study-analytics/stats in parallel,
  // and the latter calls this same path internally — two concurrent plain
  // inserts for "today" raced each other and left duplicate rows in prod.
  upsertForDay(
    studentId: string,
    periodStart: Date,
    periodEnd: Date,
    score: number,
    activeDays: number,
    plannedDays: number,
    completedDays: number
  ) {
    const data = { score, activeDays, plannedDays, completedDays };
    return this.db.consistencyScore.upsert({
      where: { studentId_periodEnd: { studentId, periodEnd: startOfDay(periodEnd) } },
      create: { studentId, periodStart: startOfDay(periodStart), periodEnd: startOfDay(periodEnd), ...data },
      update: data,
    });
  }
}
