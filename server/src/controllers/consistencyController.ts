import { Request, Response } from "express";
import { ConsistencyService } from "../services/consistencyService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new ConsistencyService();

export const getScore = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getScore(studentId));
});
