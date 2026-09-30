import { Request, Response } from "express";
import { AuthService } from "../services/authService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { setAuthCookies, clearAuthCookies } from "../utils/authCookies";

const authService = new AuthService();

// Tokens are never put in the JSON body — only in httpOnly cookies (see
// setAuthCookies) — so client-side JS, including anything an XSS bug might
// run, has no way to read them at all. Only the non-sensitive `user` object
// goes back in the response.
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await authService.register(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await authService.login(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const incoming = req.cookies?.refreshToken;
  if (!incoming) throw AppError.unauthorized("Missing refresh token");
  const { accessToken, refreshToken, user } = await authService.refresh(incoming);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const incoming = req.cookies?.refreshToken;
  if (incoming) await authService.logout(incoming);
  clearAuthCookies(res);
  res.status(204).send();
});
