import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./academic.controller";

const router = Router();
router.use(authenticate);

const canRead   = requirePermission("department.read");
const canManage = requirePermission("department.manage");
const courseRead   = requirePermission("course.read");
const courseManage = requirePermission("course.manage");
const sectionRead   = requirePermission("section.read");
const sectionManage = requirePermission("section.manage");

// ── Departments ───────────────────────────────────────────────
router.get   ("/departments",          canRead,   ctrl.getDepartments);
router.get   ("/departments/:id",      canRead,   ctrl.getDepartment);
router.post  ("/departments",          canManage, ctrl.createDepartment);
router.patch ("/departments/:id",      canManage, ctrl.updateDepartment);
router.patch ("/departments/:id/hod",  canManage, ctrl.assignHod);

// ── Programs ──────────────────────────────────────────────────
router.get   ("/programs",      requirePermission("program.read"),   ctrl.getPrograms);
router.get   ("/programs/:id",  requirePermission("program.read"),   ctrl.getProgram);
router.post  ("/programs",      requirePermission("program.manage"), ctrl.createProgram);
router.patch ("/programs/:id",  requirePermission("program.manage"), ctrl.updateProgram);

// ── Academic Sessions ─────────────────────────────────────────
router.get   ("/programs/:programId/sessions",  canRead, ctrl.getSessions);
router.get   ("/sessions/:id",                  canRead, ctrl.getSession);
router.post  ("/sessions",                      canManage, ctrl.createSession);
router.patch ("/sessions/:id",                  canManage, ctrl.updateSession);

// ── Semesters ─────────────────────────────────────────────────
router.get   ("/sessions/:sessionId/semesters", canRead,   ctrl.getSemesters);
router.get   ("/semesters/:id",                 canRead,   ctrl.getSemester);
router.post  ("/semesters",                     canManage, ctrl.createSemester);
router.patch ("/semesters/:id",                 canManage, ctrl.updateSemester);

// ── Courses ───────────────────────────────────────────────────
router.get   ("/courses",                             courseRead,   ctrl.getCourses);
router.get   ("/courses/:id",                         courseRead,   ctrl.getCourse);
router.post  ("/courses",                             courseManage, ctrl.createCourse);
router.patch ("/courses/:id",                         courseManage, ctrl.updateCourse);
router.post  ("/courses/:id/semesters",               courseManage, ctrl.assignCourseToSemester);
router.delete("/courses/:id/semesters/:semesterId",   courseManage, ctrl.removeCourseFromSemester);

// ── Sections ──────────────────────────────────────────────────
router.get   ("/sections",                              sectionRead,   ctrl.getSections);
router.get   ("/sections/:id",                          sectionRead,   ctrl.getSection);
router.post  ("/sections",                              sectionManage, ctrl.createSection);
router.patch ("/sections/:id",                          sectionManage, ctrl.updateSection);
router.post  ("/sections/:id/teachers",                 sectionManage, ctrl.assignTeacher);
router.delete("/sections/:id/teachers/:staffProfileId", sectionManage, ctrl.removeTeacher);

export default router;
