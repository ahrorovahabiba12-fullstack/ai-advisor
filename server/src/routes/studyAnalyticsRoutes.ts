import { Router } from "express";
import * as studyAnalyticsController from "../controllers/studyAnalyticsController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const studyAnalyticsRouter = Router();
studyAnalyticsRouter.use(requireAuth, requireRole("STUDENT"));
studyAnalyticsRouter.get("/stats", studyAnalyticsController.getStats);
studyAnalyticsRouter.get("/recommendation", studyAnalyticsController.getRecommendation);
