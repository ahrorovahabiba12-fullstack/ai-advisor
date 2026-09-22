import { PrismaClient } from "@prisma/client";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export class DailyCoachRepository {
  constructor(private db: PrismaClient) {}

  findForDate(studentId: string, date: Date, lang: string) {
    return this.db.dailyCoach.findFirst({
      where: { studentId, coachDate: { gte: startOfDay(date), lte: endOfDay(date) }, lang },
    });
  }

  create(
    studentId: string,
    date: Date,
    message: string,
    recommendedActions: string[],
    lang: string,
    wasActiveWhenGenerated: boolean
  ) {
    return this.db.dailyCoach.create({
      data: { studentId, coachDate: startOfDay(date), message, recommendedActions, lang, wasActiveWhenGenerated },
    });
  }

  update(id: string, message: string, recommendedActions: string[], wasActiveWhenGenerated: boolean) {
    return this.db.dailyCoach.update({
      where: { id },
      data: { message, recommendedActions, wasActiveWhenGenerated },
    });
  }
}
