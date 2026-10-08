import { PrismaClient, StudySessionSource } from "@prisma/client";

export class StudySessionRepository {
  constructor(private db: PrismaClient) {}

  findActive(scheduleId: string, studentId: string) {
    return this.db.studySession.findFirst({
      where: { scheduleId, studentId, status: "IN_PROGRESS" },
    });
  }

  start(studentId: string, scheduleId: string, subjectId: string | null, source: StudySessionSource) {
    return this.db.studySession.create({
      data: {
        studentId,
        scheduleId,
        subjectId,
        startedAt: new Date(),
        minutes: 0,
        status: "IN_PROGRESS",
        source,
      },
    });
  }

  complete(id: string, completedAt: Date, minutes: number, seconds: number) {
    return this.db.studySession.update({
      where: { id },
      data: { completedAt, minutes, seconds, status: "COMPLETED" },
    });
  }

  /**
   * Records an already-finished session directly, for completions that never
   * went through start()/findActive() — e.g. a quiz-supplied duration for a
   * schedule item that was never explicitly moved to IN_PROGRESS first.
   */
  createCompleted(
    studentId: string,
    scheduleId: string,
    subjectId: string | null,
    startedAt: Date,
    completedAt: Date,
    minutes: number,
    seconds: number,
    source: StudySessionSource
  ) {
    return this.db.studySession.create({
      data: { studentId, scheduleId, subjectId, startedAt, completedAt, minutes, seconds, status: "COMPLETED", source },
    });
  }

  // Companion to ScheduleRepository.skipItems — a dangling active session for
  // a Schedule item that just got auto-skipped (its day has passed, it was
  // never completed) should stop looking "in progress" too, not keep sitting
  // open forever with no completedAt.
  abandonActiveForSchedules(scheduleIds: string[]) {
    return this.db.studySession.updateMany({
      where: { scheduleId: { in: scheduleIds }, status: "IN_PROGRESS" },
      data: { status: "SKIPPED" },
    });
  }

  findRecent(studentId: string, since: Date) {
    return this.db.studySession.findMany({
      where: { studentId, startedAt: { gte: since } },
      orderBy: { startedAt: "asc" },
    });
  }

  /**
   * Real elapsed time for quiz-triggered sessions only — the counterpart to
   * Progress.studyMinutes, which is deliberately 0 for these (see quizService).
   * Callers add this on top of Progress.studyMinutes to get true daily activity
   * without double-counting SCHEDULE-sourced sessions (already credited there).
   */
  findCompletedQuizSessions(studentId: string, since: Date) {
    return this.db.studySession.findMany({
      where: { studentId, status: "COMPLETED", source: "QUIZ", completedAt: { gte: since } },
      select: { completedAt: true, minutes: true },
    });
  }
}
