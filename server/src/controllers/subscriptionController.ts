import { Request, Response } from "express";
import { SubscriptionService } from "../services/subscriptionService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { z } from "zod";

const service = new SubscriptionService();

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const parentId = req.auth?.parentId;
  if (!parentId) throw AppError.forbidden();
  res.status(200).json(await service.getStatus(parentId));
});

export const startUpgrade = asyncHandler(async (req: Request, res: Response) => {
  const parentId = req.auth?.parentId;
  if (!parentId) throw AppError.forbidden();
  res.status(200).json(await service.startUpgrade(parentId));
});

const confirmSchema = z.object({ reference: z.string().min(1) });

export const confirmUpgrade = asyncHandler(async (req: Request, res: Response) => {
  const parentId = req.auth?.parentId;
  if (!parentId) throw AppError.forbidden();
  const { reference } = confirmSchema.parse(req.body);
  res.status(200).json(await service.confirmUpgrade(parentId, reference));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const parentId = req.auth?.parentId;
  if (!parentId) throw AppError.forbidden();
  res.status(200).json(await service.cancel(parentId));
});
