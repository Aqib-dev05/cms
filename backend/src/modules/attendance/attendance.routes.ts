import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./attendance.controller";

const router = Router();
router.use(authenticate);

router.get("/me",                                requirePermission("attendance.read"), ctrl.getMyAttendance);
router.get("/sessions/:id",                      requirePermission("attendance.read"), ctrl.getSession);
router.get("/sections/:sectionId/sessions",      requirePermission("attendance.read"), ctrl.getSectionSessions);
router.get("/sections/:sectionId/summary",       requirePermission("attendance.read"), ctrl.getSectionSummary);
router.get("/students/:userId",                  requirePermission("attendance.read"), ctrl.getStudentAttendance);

router.post  ("/",                               requirePermission("attendance.create"), ctrl.markAttendance);
router.patch ("/records/:recordId",              requirePermission("attendance.update"), ctrl.updateRecord);

export default router;
