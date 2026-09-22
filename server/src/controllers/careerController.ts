import { Request, Response } from "express";
import { CareerService } from "../services/careerService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new CareerService();

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getCareerRecommendations(studentId, req.lang));
});

export const getRoadmap = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.listRoadmap(studentId, req.params.careerCode, req.lang));
});

export const getUniversities = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.listUniversities(studentId, req.lang));
});

export const getCatalog = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await service.listCareerCatalog(req.lang));
});
