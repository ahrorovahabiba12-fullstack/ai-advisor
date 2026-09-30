import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/authValidators";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/login", validate(loginSchema), authController.login);
// /refresh and /logout take their refresh token from the httpOnly cookie
// (see authCookies.ts), never from the request body.
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
