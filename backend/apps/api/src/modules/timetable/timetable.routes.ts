import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as ctrl from "./timetable.controller";

const router = Router();
router.use(authenticate);

router.get("/me",                              ctrl.getMyTimetable);
router.get("/sections/:sectionId",             requirePermission("timetable.read"), ctrl.getSectionTimetable);
router.get("/teachers/:staffProfileId",        requirePermission("timetable.read"), ctrl.getTeacherTimetable);
router.post("/",                               requirePermission("timetable.manage"), ctrl.createSlot);
router.patch("/:id",                           requirePermission("timetable.manage"), ctrl.updateSlot);
router.delete("/:id",                          requirePermission("timetable.manage"), ctrl.deleteSlot);

export default router;
