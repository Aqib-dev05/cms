import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./notices.controller";

const router = Router();
router.use(authenticate);

router.get  ("/",              requirePermission("notice.read"),   ctrl.getNotices);
router.get  ("/:id",           requirePermission("notice.read"),   ctrl.getNotice);
router.post ("/",              requirePermission("notice.create"), ctrl.createNotice);
router.patch("/:id",           requirePermission("notice.manage"), ctrl.updateNotice);
router.patch("/:id/publish",   requirePermission("notice.manage"), ctrl.publishNotice);
router.delete("/:id",          requirePermission("notice.manage"), ctrl.deleteNotice);

export default router;
