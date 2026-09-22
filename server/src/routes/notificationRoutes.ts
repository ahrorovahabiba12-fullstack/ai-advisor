import { Router } from "express";
import * as notificationController from "../controllers/notificationController";
import { requireAuth } from "../middleware/authMiddleware";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/", notificationController.list);
notificationRouter.get("/unread-count", notificationController.unreadCount);
notificationRouter.patch("/:id/read", notificationController.markRead);
