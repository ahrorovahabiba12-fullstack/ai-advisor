import { Request, Response } from "express";
import { RecommendationService } from "../services/recommendationService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new RecommendationService();

export const getLearningRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  const rec = await service.getLearningRecommendation(studentId, req.lang);
  res.status(200).json(rec);
});
