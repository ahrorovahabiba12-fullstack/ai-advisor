import { Router } from "express";
import * as parentController from "../controllers/parentController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const parentRouter = Router();
parentRouter.use(requireAuth, requireRole("PARENT"));
parentRouter.get("/children", parentController.listChildren);
parentRouter.get("/children/:studentId/dashboard", parentController.getChildDashboard);
parentRouter.post("/children/:studentId/report", parentController.generateReport);
