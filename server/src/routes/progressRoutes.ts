import { Router } from "express";
import * as progressController from "../controllers/progressController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const progressRouter = Router();
progressRouter.use(requireAuth, requireRole("STUDENT"));
progressRouter.get("/overview", progressController.getOverview);
progressRouter.get("/analyze", progressController.analyze);
