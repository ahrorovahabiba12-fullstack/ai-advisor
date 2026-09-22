import { Request, Response } from "express";
import { ParentService } from "../services/parentService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new ParentService();

export const listChildren = asyncHandler(async (req: Request, res: Response) => {
  const parentId = req.auth?.parentId;
  if (!parentId) throw AppError.forbidden();
  res.status(200).json(await service.listChildren(parentId));
});

export const getChildDashboard = asyncHandler(async (req: Request, res: Response) => {
  const parentId = req.auth?.parentId;
  if (!parentId) throw AppError.forbidden();
  res.status(200).json(await service.getChildDashboard(parentId, req.params.studentId, req.lang));
});

export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  const parentId = req.auth?.parentId;
  if (!parentId) throw AppError.forbidden();
  res.status(200).json(await service.generateReport(parentId, req.params.studentId, req.lang));
});
