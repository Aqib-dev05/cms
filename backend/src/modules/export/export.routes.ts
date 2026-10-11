import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import * as ctrl from "./export.controller";

const router = Router();
router.use(authenticate);

router.get("/",          ctrl.listResources);
router.get("/:resource", ctrl.download);

export default router;
