import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./admissions.controller";

const router = Router();

// Public route — anyone can submit an application (no auth needed)
router.post("/apply", ctrl.submitApplication);

// Protected routes
router.use(authenticate);
router.get  ("/",                    requirePermission("admission.read"),    ctrl.getApplications);
router.get  ("/:id",                 requirePermission("admission.read"),    ctrl.getApplication);
router.patch("/:id/review",          requirePermission("admission.update"),  ctrl.reviewApplication);
router.post ("/:id/enroll",          requirePermission("admission.approve"), ctrl.enrollApplicant);

export default router;
