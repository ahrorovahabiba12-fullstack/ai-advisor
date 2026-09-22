import { Request, Response } from "express";
import { AuthService } from "../services/authService";
import { asyncHandler } from "../utils/asyncHandler";

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.register(req.body);
  res.status(201).json(session);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.login(req.body);
  res.status(200).json(session);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.refresh(req.body.refreshToken);
  res.status(200).json(session);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
});
