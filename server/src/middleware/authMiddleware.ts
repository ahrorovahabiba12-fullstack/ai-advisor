import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { AccessTokenPayload, verifyAccessToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Missing bearer token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(AppError.unauthorized("Invalid or expired token"));
  }
}
