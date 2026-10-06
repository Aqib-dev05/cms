import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./exams.controller";

const router = Router();
router.use(authenticate);

// Grade reports
router.get("/me/grades",                requirePermission("grade.read"),   ctrl.getMyGrades);
router.get("/students/:userId/grades",  requirePermission("grade.read"),   ctrl.getStudentGrades);

// Exam listing & detail
router.get("/",                         requirePermission("exam.read"),    ctrl.getExams);
router.get("/:id",                      requirePermission("exam.read"),    ctrl.getExam);
router.get("/:id/summary",              requirePermission("grade.read"),   ctrl.getSectionSummary);

// Exam management
router.post  ("/",                      requirePermission("exam.create"),  ctrl.createExam);
router.patch ("/:id",                   requirePermission("exam.manage"),  ctrl.updateExam);
router.delete("/:id",                   requirePermission("exam.manage"),  ctrl.deleteExam);
router.patch ("/:id/publish",           requirePermission("exam.manage"),  ctrl.publishExam);
router.patch ("/:id/unpublish",         requirePermission("exam.manage"),  ctrl.unpublishExam);

// Results
router.post  ("/:id/results",           requirePermission("grade.create"), ctrl.enterResult);
router.post  ("/:id/results/bulk",      requirePermission("grade.create"), ctrl.bulkEnterResults);
router.patch ("/:id/results/publish",   requirePermission("grade.manage"), ctrl.publishResults);

export default router;
