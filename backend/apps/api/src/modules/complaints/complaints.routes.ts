import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./complaints.controller";

const router = Router();
router.use(authenticate);

router.get("/categories",        ctrl.getCategories);
router.get("/stats",             requirePermission("complaint.manage"), ctrl.getStats);
router.get("/",                  requirePermission("complaint.read"),   ctrl.getComplaints);
router.get("/:id",               requirePermission("complaint.read"),   ctrl.getComplaint);

router.post("/",                 requirePermission("complaint.create"), ctrl.createComplaint);
router.post("/:id/comments",     requirePermission("complaint.read"),   ctrl.addComment);
router.patch("/:id/assign",      requirePermission("complaint.assign"), ctrl.assignComplaint);
router.patch("/:id/status",      requirePermission("complaint.resolve"),ctrl.updateStatus);

export default router;
