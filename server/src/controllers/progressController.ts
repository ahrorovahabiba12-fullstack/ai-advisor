import { Request, Response } from "express";
import { ProgressService } from "../services/progressService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new ProgressService();

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getOverview(studentId, req.lang));
});

export const analyze = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.analyzeWithAI(studentId, req.lang));
});
