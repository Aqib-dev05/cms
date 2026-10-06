import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./audit.controller";

const router = Router();
router.use(authenticate);
router.use(requirePermission("audit.read"));

router.get("/",         ctrl.getLogs);
router.get("/stats",    ctrl.getStats);
router.get("/modules",  ctrl.getModules);
router.get("/:id",      ctrl.getLog);

export default router;
