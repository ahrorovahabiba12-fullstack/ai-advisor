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
  // The browser client authenticates via the httpOnly accessToken cookie —
  // never readable by client-side JS, which is what keeps an XSS bug from
  // being able to exfiltrate it. The Authorization header is kept as a
  // fallback only for non-browser callers (curl, scripts, tests); it isn't
  // how the frontend authenticates.
  const header = req.headers.authorization;
  const token = req.cookies?.accessToken ?? (header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined);
  if (!token) {
    return next(AppError.unauthorized("Missing access token"));
  }
  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(AppError.unauthorized("Invalid or expired token"));
  }
}
