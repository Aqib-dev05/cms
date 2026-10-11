import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./fund.controller";

const router = Router();
router.use(authenticate);

router.get ("/categories",        requirePermission("fund.read"),   ctrl.getCategories);
router.get ("/summary",           requirePermission("fund.read"),   ctrl.getSummary);
router.get ("/entries",           requirePermission("fund.read"),   ctrl.listEntries);
router.post("/entries",           requirePermission("fund.create"), ctrl.createEntry);
router.post("/entries/:id/void",  requirePermission("fund.manage"), ctrl.voidEntry);

export default router;
