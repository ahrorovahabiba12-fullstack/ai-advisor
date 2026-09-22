import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { GamificationService } from "../../src/services/gamificationService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createBadge } from "../helpers/fixtures";

describe("GamificationService.listAllBadgesWithStatus (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("marks badges the student has unlocked as unlocked, with their unlock date", async () => {
    const { student } = await createStudentUser();
    const b1 = await createBadge({ code: "FIRST_QUIZ" });
    const b2 = await createBadge({ code: "SEVEN_DAY_STREAK" });
    const unlockedAt = new Date("2026-01-01");
    await prisma.achievement.create({ data: { studentId: student.id, badgeId: b1.id, unlockedAt } });

    const result = await new GamificationService().listAllBadgesWithStatus(student.id);

    expect(result).toEqual([
      { badge: expect.objectContaining({ id: b1.id, code: "FIRST_QUIZ" }), unlocked: true, unlockedAt },
      { badge: expect.objectContaining({ id: b2.id, code: "SEVEN_DAY_STREAK" }), unlocked: false, unlockedAt: null },
    ]);
  });

  it("returns every badge in the catalog as locked when the student has unlocked none yet", async () => {
    const { student } = await createStudentUser();
    const badge = await createBadge({ code: "FIRST_QUIZ" });

    const result = await new GamificationService().listAllBadgesWithStatus(student.id);

    expect(result).toEqual([{ badge: expect.objectContaining({ id: badge.id, code: "FIRST_QUIZ" }), unlocked: false, unlockedAt: null }]);
  });
});
