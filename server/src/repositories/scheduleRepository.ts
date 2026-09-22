import { PrismaClient, ScheduleStatus } from "@prisma/client";

export class ScheduleRepository {
  constructor(private db: PrismaClient) {}

  findByWeek(studentId: string, weekStart: Date) {
    return this.db.schedule.findMany({
      where: { studentId, weekStart },
      include: { subject: true, studySessions: true },
      orderBy: { dayOfWeek: "asc" },
    });
  }

  createMany(
    studentId: string,
    weekStart: Date,
    items: { dayOfWeek: number; title: string; subjectCode?: string; minutes: number }[],
    subjectIdByCode: Map<string, string>
  ) {
    return this.db.schedule.createMany({
      data: items.map((i) => ({
        studentId,
        weekStart,
        dayOfWeek: i.dayOfWeek,
        title: i.title,
        subjectId: i.subjectCode ? subjectIdByCode.get(i.subjectCode) : undefined,
        minutes: i.minutes,
        status: ScheduleStatus.TODO,
        source: "ai",
      })),
    });
  }

  findOne(id: string, studentId: string) {
    return this.db.schedule.findFirst({ where: { id, studentId } });
  }

  updateStatus(id: string, studentId: string, status: ScheduleStatus, lastScore?: number) {
    // studentId filter enforces ownership at the query level, not just in the controller.
    return this.db.schedule.updateMany({
      where: { id, studentId },
      data: lastScore === undefined ? { status } : { status, lastScore },
    });
  }

  /**
   * Inserts a single COMPLETED item for today, for a subject the day's plan didn't
   * already include — used when a quiz is taken for a subject outside today's Schedule,
   * so that real activity is still reflected instead of silently going unrecorded.
   */
  createCompletedNow(
    studentId: string,
    weekStart: Date,
    dayOfWeek: number,
    subjectId: string,
    title: string,
    minutes: number,
    lastScore: number
  ) {
    return this.db.schedule.create({
      data: {
        studentId,
        weekStart,
        dayOfWeek,
        title,
        subjectId,
        minutes,
        status: ScheduleStatus.COMPLETED,
        source: "quiz",
        lastScore,
      },
    });
  }

  deleteWeek(studentId: string, weekStart: Date) {
    return this.db.schedule.deleteMany({ where: { studentId, weekStart } });
  }

  findRecent(studentId: string, since: Date) {
    return this.db.schedule.findMany({ where: { studentId, weekStart: { gte: since } } });
  }
}
