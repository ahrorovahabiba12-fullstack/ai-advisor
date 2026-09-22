import { Router, Request, Response } from "express";
import { SubjectRepository } from "../repositories/subjectRepository";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";
import { prisma } from "../config/prisma";
import { pick } from "../utils/localize";

const repo = new SubjectRepository(prisma);

export const subjectRouter = Router();
subjectRouter.use(requireAuth);
subjectRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const subjects = await repo.findAll();
    res.status(200).json(subjects.map((s) => ({ ...s, name: pick(s.nameUz, s.nameRu, req.lang) })));
  })
);
