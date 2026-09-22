import { Router } from "express";
import * as dailyCoachController from "../controllers/dailyCoachController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const dailyCoachRouter = Router();
dailyCoachRouter.use(requireAuth, requireRole("STUDENT"));
dailyCoachRouter.get("/today", dailyCoachController.getToday);
