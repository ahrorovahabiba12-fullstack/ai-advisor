import { Router } from "express";
import * as careerController from "../controllers/careerController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const careerRouter = Router();
careerRouter.use(requireAuth, requireRole("STUDENT"));
careerRouter.get("/recommendations", careerController.getRecommendations);
careerRouter.get("/roadmap/:careerCode", careerController.getRoadmap);
careerRouter.get("/universities", careerController.getUniversities);
careerRouter.get("/catalog", careerController.getCatalog);
