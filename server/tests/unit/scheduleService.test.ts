import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { ScheduleService } from "../../src/services/scheduleService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createSubject, startOfDay } from "../helpers/fixtures";

// Same convention the service itself uses (Monday=1..Sunday=7) so fixtures
// line up with "today" regardless of which real weekday the suite runs on.
function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
const weekStart = mondayOf(new Date());
const jsDay = new Date().getDay();
const todayIso = jsDay === 0 ? 7 : jsDay;

describe("ScheduleService — markStatus (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  describe("Progress crediting (unchanged behavior)", () => {
    it("credits Progress with the task's real minutes when a task newly becomes COMPLETED", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      const updated = await prisma.schedule.findUnique({ where: { id: schedule.id } });
      expect(updated?.status).toBe("COMPLETED");
      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toMatchObject({ studyMinutes: 45, completedTasks: 1 });
    });

    it("does NOT credit Progress when moving between two non-COMPLETED statuses", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "IN_PROGRESS");

      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toBeNull();
    });

    it("reverses the credit (undo) when a COMPLETED task is moved back to another status", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "COMPLETED", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "TODO");

      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toMatchObject({ studyMinutes: -45, completedTasks: -1 });
    });

    it("is a no-op (no DB write, no crediting) when the status doesn't actually change", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "COMPLETED", source: "ai" },
      });

      const result = await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      expect(result).toEqual({ success: true });
      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toBeNull();
    });

    it("rejects when the schedule item doesn't belong to this student (ownership)", async () => {
      const { student: owner } = await createStudentUser();
      const { student: attacker } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: owner.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await expect(new ScheduleService().markStatus(attacker.id, schedule.id, "COMPLETED")).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("getCurrentWeek — actualMinutes reflects real spent time, not the plan", () => {
    it("reports the real elapsed StudySession minutes for a completed task, not the planned Schedule.minutes", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" },
      });
      const startedAt = new Date(Date.now() - 12 * 60 * 1000); // 12 real minutes elapsed
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      const service = new ScheduleService();
      await service.markStatus(student.id, schedule.id, "COMPLETED");
      const week = await service.getCurrentWeek(student.id, "uz");

      const item = week.find((i) => i.id === schedule.id)!;
      expect(item.minutes).toBe(45); // the plan is unchanged
      expect(item.actualMinutes).toBeGreaterThanOrEqual(11);
      expect(item.actualMinutes).toBeLessThanOrEqual(13);
    });

    it("reports 0 actual minutes for a task with no completed StudySession yet", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      const week = await new ScheduleService().getCurrentWeek(student.id, "uz");

      expect(week[0].actualMinutes).toBe(0);
    });

    it("keeps full second-level precision in actualSeconds for a sub-minute completion, instead of rounding it away", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 20, status: "IN_PROGRESS", source: "ai" },
      });
      const startedAt = new Date(Date.now() - 20 * 1000); // 20 real seconds elapsed — rounds to "0 daqiqa"
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      const service = new ScheduleService();
      await service.markStatus(student.id, schedule.id, "COMPLETED");
      const week = await service.getCurrentWeek(student.id, "uz");

      const item = week.find((i) => i.id === schedule.id)!;
      expect(item.actualMinutes).toBe(0); // still rounds to 0 minutes...
      expect(item.actualSeconds).toBeGreaterThanOrEqual(19); // ...but the real ~20s is preserved
      expect(item.actualSeconds).toBeLessThanOrEqual(22);
    });
  });

  describe("StudySession lifecycle", () => {
    it("starts a new StudySession when a task enters IN_PROGRESS", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "IN_PROGRESS");

      const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({ studentId: student.id, subjectId: subject.id, status: "IN_PROGRESS" });
    });

    it("does NOT start a duplicate StudySession if one is already active for this task", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt: new Date(), minutes: 0, status: "IN_PROGRESS" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "IN_PROGRESS");

      const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(sessions).toHaveLength(1);
    });

    it("completes the active StudySession (with real elapsed minutes) when the task becomes COMPLETED", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" },
      });
      const startedAt = new Date(Date.now() - 12 * 60 * 1000); // started 12 minutes ago
      const session = await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      const updated = await prisma.studySession.findUnique({ where: { id: session.id } });
      expect(updated?.status).toBe("COMPLETED");
      expect(updated?.completedAt).not.toBeNull();
      expect(updated?.minutes).toBeGreaterThanOrEqual(11);
      expect(updated?.minutes).toBeLessThanOrEqual(13);
    });

    it("skips StudySession completion gracefully if no active session exists (e.g. jumped straight to COMPLETED)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "TODO", source: "ai" },
      });

      await expect(new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED")).resolves.toEqual({ success: true });
      const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(sessions).toHaveLength(0);
    });

    it("leaves a completed StudySession untouched on undo (history is preserved, not deleted or mutated)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "COMPLETED", source: "ai" },
      });
      const completedAt = new Date();
      const session = await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt: new Date(Date.now() - 60000), completedAt, minutes: 1, status: "COMPLETED" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "TODO");

      const unchanged = await prisma.studySession.findUnique({ where: { id: session.id } });
      expect(unchanged).toMatchObject({ status: "COMPLETED", minutes: 1 });
      const allSessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
      expect(allSessions).toHaveLength(1); // no new session started either
    });

    it("Progress crediting still uses the Schedule item's planned minutes, not the StudySession's real elapsed minutes", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject();
      const schedule = await prisma.schedule.create({
        data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 45, status: "IN_PROGRESS", source: "ai" }, // planned: 45
      });
      const startedAt = new Date(Date.now() - 90 * 60 * 1000); // 90 real minutes elapsed
      await prisma.studySession.create({
        data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
      });

      await new ScheduleService().markStatus(student.id, schedule.id, "COMPLETED");

      // Progress gets the planned 45, never the real ~90 elapsed minutes — Progress logic is unchanged.
      const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
      expect(progress).toMatchObject({ studyMinutes: 45, completedTasks: 1 });
    });
  });
});

describe("ScheduleService.autoTransitionForSubject (quiz-driven auto completion, real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("moves a TODO item for the given subject/day to IN_PROGRESS and starts a StudySession", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "IN_PROGRESS");

    const updated = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(updated?.status).toBe("IN_PROGRESS");
    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(1);
  });

  it("ignores items for other subjects or other days", async () => {
    const { student } = await createStudentUser();
    const math = await createSubject({ code: "MATH" });
    const english = await createSubject({ code: "ENGLISH" });
    const wrongSubject = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: english.id, minutes: 30, status: "TODO", source: "ai" },
    });
    const wrongDay = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso === 1 ? 2 : 1, title: "t", subjectId: math.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, math.id, "IN_PROGRESS");

    expect((await prisma.schedule.findUnique({ where: { id: wrongSubject.id } }))?.status).toBe("TODO");
    expect((await prisma.schedule.findUnique({ where: { id: wrongDay.id } }))?.status).toBe("TODO");
  });

  it("does not touch an item that's already IN_PROGRESS or COMPLETED when targeting IN_PROGRESS", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const inProgress = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
    });
    const completed = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "COMPLETED", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "IN_PROGRESS");

    expect((await prisma.schedule.findUnique({ where: { id: inProgress.id } }))?.status).toBe("IN_PROGRESS");
    expect((await prisma.schedule.findUnique({ where: { id: completed.id } }))?.status).toBe("COMPLETED");
  });

  it("completes an IN_PROGRESS item and closes its StudySession, WITHOUT crediting Progress (caller already did)", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
    });
    const startedAt = new Date(Date.now() - 10 * 60 * 1000);
    const session = await prisma.studySession.create({
      data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 80, "uz");

    const updatedSchedule = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(updatedSchedule).toMatchObject({ status: "COMPLETED", lastScore: 80 });
    const updatedSession = await prisma.studySession.findUnique({ where: { id: session.id } });
    expect(updatedSession?.status).toBe("COMPLETED");
    const progress = await prisma.progress.findUnique({ where: { studentId_date: { studentId: student.id, date: startOfDay() } } });
    expect(progress).toBeNull();
  });

  it("also completes a still-TODO item directly (quiz submitted without ever pressing Boshlash)", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 75, "uz");

    const updated = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(updated).toMatchObject({ status: "COMPLETED", lastScore: 75 });
    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(0); // no elapsedSeconds supplied and nothing to close — that's fine
  });

  it("records a StudySession with the quiz-supplied duration for a still-TODO item, even though it was never started", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "TODO", source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 75, "uz", 37);

    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ status: "COMPLETED", seconds: 37, minutes: 1 });
  });

  it("prefers the quiz-supplied duration over inferring elapsed time from an existing StudySession", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "IN_PROGRESS", source: "ai" },
    });
    const startedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 real minutes, per StudySession bookkeeping
    await prisma.studySession.create({
      data: { studentId: student.id, scheduleId: schedule.id, subjectId: subject.id, startedAt, minutes: 0, status: "IN_PROGRESS" },
    });

    // Quiz itself reports only 22 real seconds elapsed (start-to-submit) — this
    // should win over the 10-minute StudySession.startedAt inference.
    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 80, "uz", 22);

    const sessions = await prisma.studySession.findMany({ where: { scheduleId: schedule.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ status: "COMPLETED", seconds: 22, minutes: 0 });
  });

  it("is a no-op for an already-COMPLETED item", async () => {
    const { student } = await createStudentUser();
    const subject = await createSubject({ code: "MATH" });
    const schedule = await prisma.schedule.create({
      data: { studentId: student.id, weekStart, dayOfWeek: todayIso, title: "t", subjectId: subject.id, minutes: 30, status: "COMPLETED", lastScore: 60, source: "ai" },
    });

    await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED");

    const unchanged = await prisma.schedule.findUnique({ where: { id: schedule.id } });
    expect(unchanged?.lastScore).toBe(60); // untouched, not overwritten with undefined/null
  });

  describe("subject not on today's plan at all", () => {
    it("inserts a new COMPLETED item for today when a score is provided and nothing matched", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE", nameUz: "Tabiatshunoslik", nameRu: "Естествознание" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 90, "uz");

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ weekStart, dayOfWeek: todayIso, status: "COMPLETED", lastScore: 90 });
      expect(created[0].title).toContain("Tabiatshunoslik");
    });

    it("also records a StudySession with the quiz-supplied duration for the newly-inserted item — this was the original bug (item created COMPLETED with no timing at all)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 90, "uz", 14);

      const created = await prisma.schedule.findFirst({ where: { studentId: student.id, subjectId: subject.id } });
      const sessions = await prisma.studySession.findMany({ where: { scheduleId: created!.id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({ status: "COMPLETED", seconds: 14, minutes: 0 });
    });

    it("localizes the new item's title for Russian", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE", nameUz: "Tabiatshunoslik", nameRu: "Естествознание" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED", 90, "ru");

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created[0].title).toContain("Естествознание");
    });

    it("does NOT insert a new item when targeting IN_PROGRESS (only a real, scored completion adds one)", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "IN_PROGRESS");

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created).toHaveLength(0);
    });

    it("does NOT insert a new item when no score is provided at all", async () => {
      const { student } = await createStudentUser();
      const subject = await createSubject({ code: "SCIENCE" });

      await new ScheduleService().autoTransitionForSubject(student.id, subject.id, "COMPLETED");

      const created = await prisma.schedule.findMany({ where: { studentId: student.id, subjectId: subject.id } });
      expect(created).toHaveLength(0);
    });

    it("does nothing if the subject itself can't be found (defensive — never crashes the caller)", async () => {
      const { student } = await createStudentUser();

      await expect(new ScheduleService().autoTransitionForSubject(student.id, "ghost-subject-id", "COMPLETED", 50, "uz")).resolves.toBeUndefined();
      const created = await prisma.schedule.findMany({ where: { studentId: student.id } });
      expect(created).toHaveLength(0);
    });
  });
});

describe("ScheduleService — generateWeek neutral-subject computation (real DB)", () => {
  const ai = { generateLearningPlan: vi.fn() };

  function makeService() {
    return new ScheduleService(ai as any);
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    ai.generateLearningPlan.mockResolvedValue({ days: [] });
  });
  afterAll(() => prisma.$disconnect());

  it("passes every catalog subject the student hasn't tested yet as neutralSubjects", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await createSubject({ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" });
    await createSubject({ code: "HISTORY", nameUz: "Tarix", nameRu: "История" });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: math.id, level: "WEAK", score: 30, source: "test" } });

    await makeService().generateWeek(student.id, "uz");

    expect(ai.generateLearningPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        weakSubjects: [{ code: "MATH", name: "Matematika" }],
        neutralSubjects: expect.arrayContaining([
          { code: "ENGLISH", name: "Ingliz tili" },
          { code: "HISTORY", name: "Tarix" },
        ]),
      })
    );
    expect(ai.generateLearningPlan.mock.calls[0][0].neutralSubjects).toHaveLength(2);
  });

  it("excludes already-tested subjects (weak or strong) from the neutral list", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const english = await createSubject({ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" });
    await createSubject({ code: "HISTORY", nameUz: "Tarix", nameRu: "История" });
    await prisma.subjectLevel.createMany({
      data: [
        { studentId: student.id, subjectId: math.id, level: "WEAK", score: 30, source: "test" },
        { studentId: student.id, subjectId: english.id, level: "STRONG", score: 90, source: "test" },
      ],
    });

    await makeService().generateWeek(student.id, "uz");

    const call = ai.generateLearningPlan.mock.calls[0][0];
    expect(call.neutralSubjects).toEqual([{ code: "HISTORY", name: "Tarix" }]);
  });
});
