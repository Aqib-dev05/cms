import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { uploadImage, uploadDocument } from "../../middlewares/upload.middleware";
import * as ctrl from "./media.controller";

const router = Router();
router.use(authenticate);

// GET available folder keys
router.get("/folders",            ctrl.getFolders);

// GET media by id / own media
router.get("/me",                 ctrl.getMyMedia);
router.get("/:id",                ctrl.getMedia);

// Profile picture — images only, always goes to users/profiles/
router.post("/profile-picture",   uploadImage,    ctrl.uploadProfilePicture);

// General upload — ?folder=FOLDER_KEY
// e.g. ?folder=ADMISSION_DOCUMENTS  → college_cms/documents/admissions/
//      ?folder=EXAM_PAPERS           → college_cms/documents/exams/
//      ?folder=NOTICE_ATTACHMENTS    → college_cms/attachments/notices/
//      ?folder=COMPLAINT_ATTACHMENTS → college_cms/attachments/complaints/
//      ?folder=GENERAL_MEDIA         → college_cms/media/general/
router.post("/upload",            uploadDocument, ctrl.uploadFile);

// Delete
router.delete("/:id",             ctrl.deleteMedia);

export default router;
