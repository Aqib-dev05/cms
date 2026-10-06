import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission, requireRole } from "../../middlewares/permission.middleware";
import * as usersController from "./users.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Roles list — any authenticated user can fetch (needed for dropdowns)
router.get("/roles", usersController.getRoles);

// User listing & detail — requires user.read
router.get("/", requirePermission("user.read"), usersController.getUsers);
router.get("/:id", requirePermission("user.read"), usersController.getUser);

// Create staff — admin only
router.post(
  "/staff",
  requirePermission("user.manage"),
  usersController.createStaff
);

// Update staff profile
router.patch(
  "/:id/profile",
  requirePermission("user.update"),
  usersController.updateStaffProfile
);

// Activate / deactivate user
router.patch(
  "/:id/toggle-status",
  requireRole("ADMIN"),
  usersController.toggleStatus
);

// Admin resets a user's password
router.patch(
  "/:id/reset-password",
  requireRole("ADMIN"),
  usersController.resetPassword
);

export default router;
