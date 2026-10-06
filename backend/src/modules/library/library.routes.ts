import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./library.controller";

const router = Router();
router.use(authenticate);

router.get("/books",                                    requirePermission("library.read"),   ctrl.getBooks);
router.get("/books/:id",                                requirePermission("library.read"),   ctrl.getBook);
router.post("/books",                                   requirePermission("library.manage"), ctrl.createBook);
router.patch("/books/:id",                              requirePermission("library.manage"), ctrl.updateBook);
router.post("/books/:id/copies",                        requirePermission("library.manage"), ctrl.addCopies);

router.post("/issues",                                  requirePermission("library.issue"),  ctrl.issueBook);
router.patch("/issues/:issueId/return",                 requirePermission("library.return"), ctrl.returnBook);
router.get("/issues/active",                            requirePermission("library.read"),   ctrl.getActiveIssues);
router.get("/issues/overdue",                           requirePermission("library.manage"), ctrl.getOverdueIssues);
router.get("/students/:studentProfileId/history",       requirePermission("library.read"),   ctrl.getStudentHistory);

export default router;
