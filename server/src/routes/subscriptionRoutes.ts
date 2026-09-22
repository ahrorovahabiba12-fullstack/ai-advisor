import { Router } from "express";
import * as subscriptionController from "../controllers/subscriptionController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth, requireRole("PARENT"));
subscriptionRouter.get("/status", subscriptionController.getStatus);
subscriptionRouter.post("/upgrade", subscriptionController.startUpgrade);
subscriptionRouter.post("/confirm", subscriptionController.confirmUpgrade);
subscriptionRouter.post("/cancel", subscriptionController.cancel);
