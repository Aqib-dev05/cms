import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./pdf.controller";

const router = Router();
router.use(authenticate);

// Student's own report card
router.get("/report-card/me/:semesterId",             ctrl.getMyReportCard);

// Staff/admin access
router.get("/fee-receipt/:invoiceId",                 requirePermission("fee.read"),   ctrl.getFeeReceipt);
router.get("/report-card/:userId/:semesterId",        requirePermission("grade.read"), ctrl.getReportCard);

export default router;
