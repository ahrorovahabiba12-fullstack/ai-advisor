import { Request, Response } from "express";
import { StudyAnalyticsService } from "../services/studyAnalyticsService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new StudyAnalyticsService();

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getStats(studentId, req.lang));
});

export const getRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json({ recommendation: await service.getRecommendation(studentId, req.lang) });
});
