import { Router } from "express";
import * as recommendationController from "../controllers/recommendationController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const recommendationRouter = Router();
recommendationRouter.use(requireAuth, requireRole("STUDENT"));
recommendationRouter.get("/learning", recommendationController.getLearningRecommendation);
