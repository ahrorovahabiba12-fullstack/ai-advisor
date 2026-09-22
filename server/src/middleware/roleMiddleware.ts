import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

/** Restricts a route to one or more roles. Must run after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(AppError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(AppError.forbidden(`Requires role: ${roles.join(" or ")}`));
    }
    return next();
  };
}
