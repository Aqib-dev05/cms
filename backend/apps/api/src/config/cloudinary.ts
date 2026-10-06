import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure:     true,
});

export { cloudinary };

// ─── Folder Structure ─────────────────────────────────────────
//
//  {ROOT}/
//  ├── users/
//  │   └── profiles/          → profile pictures (images)
//  ├── documents/
//  │   ├── admissions/        → admission form docs & PDFs
//  │   ├── exams/             → exam papers & answer sheets
//  │   └── general/           → miscellaneous documents
//  ├── attachments/
//  │   ├── notices/           → notice board attachments
//  │   └── complaints/        → complaint evidence/files
//  └── media/
//      └── general/           → general purpose uploads
//
// ─────────────────────────────────────────────────────────────

const ROOT = env.CLOUDINARY_ROOT_FOLDER;

export const FOLDERS = {
  // Images
  USER_PROFILES:         `${ROOT}/users/profiles`,

  // Documents / PDFs
  ADMISSION_DOCUMENTS:   `${ROOT}/documents/admissions`,
  EXAM_PAPERS:           `${ROOT}/documents/exams`,
  GENERAL_DOCUMENTS:     `${ROOT}/documents/general`,

  // Attachments
  NOTICE_ATTACHMENTS:    `${ROOT}/attachments/notices`,
  COMPLAINT_ATTACHMENTS: `${ROOT}/attachments/complaints`,

  // General media
  GENERAL_MEDIA:         `${ROOT}/media/general`,
} as const;

export type FolderKey = keyof typeof FOLDERS;
