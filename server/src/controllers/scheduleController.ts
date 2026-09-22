import { Request, Response } from "express";
import { ScheduleService } from "../services/scheduleService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { z } from "zod";

const service = new ScheduleService();

export const getCurrentWeek = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getCurrentWeek(studentId, req.lang));
});

export const regenerate = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.generateWeek(studentId, req.lang));
});

const statusSchema = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "SKIPPED"]) });

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  const { status } = statusSchema.parse(req.body);
  res.status(200).json(await service.markStatus(studentId, req.params.id, status));
});
