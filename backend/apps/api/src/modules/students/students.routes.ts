import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./students.controller";

const router = Router();
router.use(authenticate);

// Student's own profile
router.get("/me", ctrl.getMyProfile);

// Listing & detail
router.get("/",              requirePermission("student.read"), ctrl.getStudents);
router.get("/reg/:regNo",    requirePermission("student.read"), ctrl.getStudentByRegNo);
router.get("/:id",           requirePermission("student.read"), ctrl.getStudent);
router.get("/:id/enrollments", requirePermission("student.read"), ctrl.getStudentEnrollments);

// Create
router.post("/", requirePermission("student.create"), ctrl.createStudent);

// Update profile
router.patch("/:id/profile", requirePermission("student.update"), ctrl.updateStudentProfile);

// Status change — admin/HOD/head clerk only
router.patch(
  "/:id/status",
  requirePermission("student.manage"),
  ctrl.updateStudentStatus
);

// Enrollment
router.post   ("/:id/enroll/:sectionId",   requirePermission("section.manage"), ctrl.enrollStudent);
router.delete ("/:id/enroll/:sectionId",   requirePermission("section.manage"), ctrl.unenrollStudent);

export default router;
