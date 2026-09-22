import { PrismaClient } from "@prisma/client";

export class GamificationRepository {
  constructor(private db: PrismaClient) {}

  findBadgeByCode(code: string) {
    return this.db.badge.findUnique({ where: { code } });
  }

  hasAchievement(studentId: string, badgeId: string) {
    return this.db.achievement.findUnique({ where: { studentId_badgeId: { studentId, badgeId } } });
  }

  grantAchievement(studentId: string, badgeId: string) {
    return this.db.achievement.create({ data: { studentId, badgeId } });
  }

  countQuizResults(studentId: string) {
    return this.db.quizResult.count({ where: { studentId } });
  }

  listAchievements(studentId: string) {
    return this.db.achievement.findMany({ where: { studentId }, include: { badge: true } });
  }

  findAllBadges() {
    return this.db.badge.findMany();
  }

  recentProgressDates(studentId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.db.progress.findMany({
      where: { studentId, date: { gte: since } },
      orderBy: { date: "desc" },
    });
  }

  // Whether this student has EVER recorded real activity (any day, any amount) —
  // distinct from "active in the last N days". A student with no row at all here
  // is brand new, not someone who "took a break".
  async hasEverBeenActive(studentId: string): Promise<boolean> {
    const row = await this.db.progress.findFirst({
      where: { studentId, OR: [{ studyMinutes: { gt: 0 } }, { completedTasks: { gt: 0 } }] },
      select: { id: true },
    });
    return row !== null;
  }

  upsertTodayProgress(studentId: string, minutesDelta: number, tasksDelta: number, scoreDelta: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.db.progress.upsert({
      where: { studentId_date: { studentId, date: today } },
      create: { studentId, date: today, studyMinutes: minutesDelta, completedTasks: tasksDelta, scoreDelta },
      update: {
        studyMinutes: { increment: minutesDelta },
        completedTasks: { increment: tasksDelta },
        scoreDelta: { increment: scoreDelta },
      },
    });
  }
}
