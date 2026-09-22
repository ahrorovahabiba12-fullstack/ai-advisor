import { Router } from "express";
import * as achievementController from "../controllers/achievementController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const achievementRouter = Router();
achievementRouter.use(requireAuth, requireRole("STUDENT"));
achievementRouter.get("/", achievementController.listAchievements);
