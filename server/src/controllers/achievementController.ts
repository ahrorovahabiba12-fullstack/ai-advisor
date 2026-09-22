import { Request, Response } from "express";
import { GamificationService } from "../services/gamificationService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { pick } from "../utils/localize";

const service = new GamificationService();

export const listAchievements = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  const [badgeStatuses, points, streak] = await Promise.all([
    service.listAllBadgesWithStatus(studentId),
    service.pointsTotal(studentId),
    service.currentStreak(studentId),
  ]);
  const badges = badgeStatuses.map((s) => ({
    id: s.badge.id,
    code: s.badge.code,
    name: pick(s.badge.nameUz, s.badge.nameRu, req.lang),
    description: pick(s.badge.description, s.badge.descriptionRu, req.lang),
    icon: s.badge.icon,
    unlocked: s.unlocked,
    unlockedAt: s.unlockedAt,
  }));
  res.status(200).json({ badges, points, streakDays: streak });
});
