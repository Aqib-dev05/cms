import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./notifications.controller";

const router = Router();
router.use(authenticate);

router.get ("/",             requirePermission("notification.read"),   ctrl.getMyNotifications);
router.get ("/unread-count", requirePermission("notification.read"),   ctrl.getUnreadCount);
router.patch("/:id/read",   requirePermission("notification.read"),   ctrl.markAsRead);
router.patch("/read-all",   requirePermission("notification.read"),   ctrl.markAllAsRead);

router.post("/send",         requirePermission("notification.manage"), ctrl.sendNotification);
router.post("/send-to-role", requirePermission("notification.manage"), ctrl.sendToRole);
router.post("/broadcast",    requirePermission("notification.manage"), ctrl.broadcastToAll);

export default router;
