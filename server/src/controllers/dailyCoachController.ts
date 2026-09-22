import { Request, Response } from "express";
import { DailyCoachService } from "../services/dailyCoachService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new DailyCoachService();

export const getToday = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getToday(studentId, req.lang));
});
