import { Request, Response, NextFunction } from "express";

export type Lang = "uz" | "ru";

declare global {
  namespace Express {
    interface Request {
      lang: Lang;
    }
  }
}

/**
 * Reads the UI language the client is currently using from the
 * `X-Lang` header (sent by the frontend's axios instance, kept in
 * sync with its i18n language switcher). Defaults to "uz" — every
 * bilingual field (Subject.nameUz/nameRu, Career.nameUz/nameRu, etc.)
 * is picked against this on the way out of each response, so the
 * whole API responds in whichever language the client asked for.
 */
export function languageMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers["x-lang"];
  const value = Array.isArray(header) ? header[0] : header;
  req.lang = value === "ru" ? "ru" : "uz";
  next();
}
