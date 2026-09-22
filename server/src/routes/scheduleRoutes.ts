import { Router } from "express";
import * as scheduleController from "../controllers/scheduleController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const scheduleRouter = Router();
scheduleRouter.use(requireAuth, requireRole("STUDENT"));
scheduleRouter.get("/current", scheduleController.getCurrentWeek);
scheduleRouter.post("/regenerate", scheduleController.regenerate);
scheduleRouter.patch("/:id/status", scheduleController.updateStatus);
