import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./staff.controller";

const router = Router();
router.use(authenticate);

router.get("/me/workload",                      ctrl.getMyWorkload);
router.post("/me/leave",                        ctrl.requestLeave);

router.get("/",                                 requirePermission("staff.read"),   ctrl.getAllStaff);
router.get("/:id",                              requirePermission("staff.read"),   ctrl.getStaff);
router.get("/:id/workload",                     requirePermission("staff.read"),   ctrl.getWorkload);
router.get("/departments/:departmentId",        requirePermission("staff.read"),   ctrl.getDepartmentStaff);
router.patch("/:id/status",                     requirePermission("staff.manage"), ctrl.updateStatus);

export default router;
