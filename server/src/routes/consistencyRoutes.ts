import { Router } from "express";
import * as consistencyController from "../controllers/consistencyController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const consistencyRouter = Router();
consistencyRouter.use(requireAuth, requireRole("STUDENT"));
consistencyRouter.get("/", consistencyController.getScore);
