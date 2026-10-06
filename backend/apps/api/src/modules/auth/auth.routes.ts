import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import * as authController from "./auth.controller";

const router = Router();

// Public routes
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Protected routes — require valid access token
router.get("/me", authenticate, authController.getMe);
router.post("/logout-all", authenticate, authController.logoutAll);
router.patch("/change-password", authenticate, authController.changePassword);

export default router;
