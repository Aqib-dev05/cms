import multer from "multer";
import { AppError } from "../utils/app-error";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_DOC_SIZE   = 20 * 1024 * 1024;  // 20 MB

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_TYPES   = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Store file in memory — uploaded to Cloudinary/R2 in the service layer
const memoryStorage = multer.memoryStorage();

function imageFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only JPEG, PNG, and WebP images are allowed", 400));
  }
}

function docFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if ([...IMAGE_TYPES, ...DOC_TYPES].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only images and PDF/Word documents are allowed", 400));
  }
}

// Profile picture upload (single image)
export const uploadImage = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
}).single("image");

// Document upload (single file — PDF, DOCX, images)
export const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: docFilter,
  limits: { fileSize: MAX_DOC_SIZE },
}).single("file");

// Multiple documents (for admission applications)
export const uploadDocuments = multer({
  storage: memoryStorage,
  fileFilter: docFilter,
  limits: { fileSize: MAX_DOC_SIZE },
}).array("files", 10);
