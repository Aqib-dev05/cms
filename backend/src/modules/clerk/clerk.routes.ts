import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./clerk.controller";

const router = Router();
router.use(authenticate, requirePermission("assistant.manage"));

router.get  ("/duties",                        ctrl.getDuties);
router.get  ("/assistants",                    ctrl.listAssistants);
router.post ("/assistants",                    ctrl.createAssistant);
router.get  ("/assistants/:id",                ctrl.getAssistant);
router.patch("/assistants/:id",                ctrl.updateAssistant);
router.put  ("/assistants/:id/duties",         ctrl.setDuties);
router.patch("/assistants/:id/status",         ctrl.setStatus);
router.patch("/assistants/:id/reset-password", ctrl.resetPassword);

export default router;
