import { ConsistencyRepository } from "../repositories/consistencyRepository";
import { prisma } from "../config/prisma";

const PERIOD_DAYS = 30;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class ConsistencyService {
  constructor(private repo = new ConsistencyRepository(prisma)) {}

  async getScore(studentId: string) {
    const today = startOfDay(new Date());
    const latest = await this.repo.findLatest(studentId);
    if (latest && startOfDay(latest.periodEnd).getTime() === today.getTime()) {
      return latest;
    }
    return this.recompute(studentId, today);
  }

  private async recompute(studentId: string, today: Date) {
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - (PERIOD_DAYS - 1));

    const progress = await this.repo.progressInRange(studentId, periodStart, today);

    // A day counts as "active" whether the student logged timed study minutes
    // OR completed a real task (e.g. a quiz) — quiz-only activity still
    // credits completedTasks on the same Progress row (studyMinutes: 0 there
    // by design, see QuizService.submitQuiz), and ignoring that made a
    // genuinely active student show a 0% consistency score.
    const activeDates = new Set(
      progress.filter((p) => p.studyMinutes > 0 || p.completedTasks > 0).map((p) => p.date.toDateString())
    );
    const completedDates = new Set(
      progress.filter((p) => p.completedTasks > 0).map((p) => p.date.toDateString())
    );

    const activeDays = activeDates.size;
    const completedDays = completedDates.size;
    const plannedDays = PERIOD_DAYS;
    const score = Math.round((activeDays / plannedDays) * 1000) / 10; // 0-100, one decimal

    return this.repo.create(studentId, periodStart, today, score, activeDays, plannedDays, completedDays);
  }
}
