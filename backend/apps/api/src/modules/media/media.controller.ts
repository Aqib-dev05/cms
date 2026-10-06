import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import { FOLDERS, FolderKey } from "../../config/cloudinary";
import * as svc from "./media.service";

// Valid folder keys exposed to clients
const ALLOWED_FOLDER_KEYS: FolderKey[] = [
  "ADMISSION_DOCUMENTS",
  "EXAM_PAPERS",
  "GENERAL_DOCUMENTS",
  "NOTICE_ATTACHMENTS",
  "COMPLAINT_ATTACHMENTS",
  "GENERAL_MEDIA",
  // USER_PROFILES is NOT listed — only accessible via /profile-picture endpoint
];

const uploadQuerySchema = z.object({
  folder: z.enum([
    "ADMISSION_DOCUMENTS",
    "EXAM_PAPERS",
    "GENERAL_DOCUMENTS",
    "NOTICE_ATTACHMENTS",
    "COMPLAINT_ATTACHMENTS",
    "GENERAL_MEDIA",
  ] as [FolderKey, ...FolderKey[]]).default("GENERAL_MEDIA"),
});

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  if (!req.file) throw AppError.badRequest("No file provided");

  const { folder } = uploadQuerySchema.parse(req.query);

  const result = await svc.uploadFile(req.file, folder, req.user.userId);
  ApiRes.created(res, result, "File uploaded successfully");
});

export const uploadProfilePicture = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  if (!req.file) throw AppError.badRequest("No image provided");

  const result = await svc.updateProfilePicture(req.user.userId, req.file);
  ApiRes.success(res, result, "Profile picture updated");
});

export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await svc.deleteMedia(req.params.id, req.user.userId);
  ApiRes.success(res, null, "File deleted");
});

export const getMedia = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getMediaById(req.params.id));
});

export const getMyMedia = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.success(res, await svc.getUserMedia(req.user.userId));
});

export const getFolders = asyncHandler(async (_req: Request, res: Response) => {
  // Return folder map so frontend knows what keys to use
  const exposed = ALLOWED_FOLDER_KEYS.reduce<Record<string, string>>((acc, key) => {
    acc[key] = FOLDERS[key];
    return acc;
  }, {});
  ApiRes.success(res, exposed);
});
