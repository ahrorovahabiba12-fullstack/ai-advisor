import { Router } from "express";
import * as chatController from "../controllers/chatController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { validate } from "../middleware/validate";
import { sendMessageSchema } from "../validators/chatValidators";

export const chatRouter = Router();
chatRouter.use(requireAuth, requireRole("STUDENT"));
chatRouter.get("/history", chatController.getHistory);
chatRouter.post("/message", validate(sendMessageSchema), chatController.sendMessage);
