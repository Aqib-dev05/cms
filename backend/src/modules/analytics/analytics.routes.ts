import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./analytics.controller";

const router = Router();
router.use(authenticate);
router.use(requirePermission("analytics.read"));

router.get("/overview",             ctrl.getOverview);
router.get("/fees/trend",           ctrl.getFeeTrend);
router.get("/attendance/trend",     ctrl.getAttendanceTrend);
router.get("/enrollment/by-program", ctrl.getEnrollmentByProgram);

export default router;
