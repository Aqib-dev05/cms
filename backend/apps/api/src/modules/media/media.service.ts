import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { FOLDERS, FolderKey } from "../../config/cloudinary";

export type { FolderKey };

export type ResourceType = "IMAGE" | "DOCUMENT" | "VIDEO" | "AUDIO" | "OTHER";

export interface UploadResult {
  id:           string;
  fileName:     string;
  originalName: string;
  fileUrl:      string;
  publicId:     string | null;
  resourceType: ResourceType;
  mimeType:     string;
  fileSize:     number;
  storage:      string;
  folder:       string;
}

// ─── Helpers ──────────────────────────────────────────────────

function detectResourceType(mimeType: string): ResourceType {
  if (mimeType.startsWith("image/"))                    return "IMAGE";
  if (mimeType.startsWith("video/"))                    return "VIDEO";
  if (mimeType.startsWith("audio/"))                    return "AUDIO";
  if (mimeType === "application/pdf")                   return "DOCUMENT";
  if (mimeType.includes("word") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation"))                return "DOCUMENT";
  return "OTHER";
}

// Cloudinary resource_type param:
//   "image" for images, "raw" for PDFs/docs, "video" for video/audio
function getCloudinaryResourceType(mimeType: string): "image" | "raw" | "video" {
  if (mimeType.startsWith("image/"))  return "image";
  if (mimeType.startsWith("video/") ||
      mimeType.startsWith("audio/"))  return "video";
  return "raw";
}

// ─── Core Upload ──────────────────────────────────────────────

export async function uploadFile(
  file:         Express.Multer.File,
  folderKey:    FolderKey,
  uploadedById: string
): Promise<UploadResult> {
  const folder       = FOLDERS[folderKey];
  const resourceType = getCloudinaryResourceType(file.mimetype);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type:   resourceType,
        use_filename:    true,
        unique_filename: true,
      },
      async (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(new AppError("File upload to Cloudinary failed", 500));
          return;
        }

        try {
          const media = await prisma.media.create({
            data: {
              fileName:     result.public_id,
              originalName: file.originalname,
              fileUrl:      result.secure_url,
              publicId:     result.public_id,
              resourceType: detectResourceType(file.mimetype),
              mimeType:     file.mimetype,
              fileSize:     file.size,
              storage:      "cloudinary",
              uploadedById,
            },
          });

          resolve({
            id:           media.id,
            fileName:     media.fileName,
            originalName: media.originalName,
            fileUrl:      media.fileUrl,
            publicId:     media.publicId,
            resourceType: media.resourceType,
            mimeType:     media.mimeType,
            fileSize:     media.fileSize,
            storage:      media.storage,
            folder,
          });
        } catch (dbError) {
          // Rollback Cloudinary upload if DB write fails
          await cloudinary.uploader
            .destroy(result.public_id, { resource_type: resourceType })
            .catch(() => null);
          reject(dbError);
        }
      }
    );

    stream.end(file.buffer);
  });
}

// ─── Profile Picture ──────────────────────────────────────────

export async function updateProfilePicture(
  userId: string,
  file:   Express.Multer.File
): Promise<UploadResult> {
  // Upload new picture to users/profiles folder
  const uploaded = await uploadFile(file, "USER_PROFILES", userId);

  // Update the correct profile and clean up old picture
  const [staffProfile, studentProfile] = await Promise.all([
    prisma.staffProfile.findUnique({ where: { userId } }),
    prisma.studentProfile.findUnique({ where: { userId } }),
  ]);

  const profile     = staffProfile ?? studentProfile;
  const profileType = staffProfile ? "staff" : "student";

  if (!profile) throw AppError.notFound("User profile not found");

  const oldMediaId = profile.profileMediaId;

  // Save new media ID to profile
  if (profileType === "staff") {
    await prisma.staffProfile.update({
      where: { userId },
      data:  { profileMediaId: uploaded.id },
    });
  } else {
    await prisma.studentProfile.update({
      where: { userId },
      data:  { profileMediaId: uploaded.id },
    });
  }

  // Delete old picture from Cloudinary + DB (after updating profile, so no dangling FK)
  if (oldMediaId) {
    const oldMedia = await prisma.media.findUnique({ where: { id: oldMediaId } }).catch(() => null);
    if (oldMedia?.publicId) {
      await cloudinary.uploader
        .destroy(oldMedia.publicId, { resource_type: "image" })
        .catch(() => null);
    }
    await prisma.media.delete({ where: { id: oldMediaId } }).catch(() => null);
  }

  return uploaded;
}

// ─── Delete ───────────────────────────────────────────────────

export async function deleteMedia(id: string, requesterId: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw AppError.notFound("Media not found");

  const requester = await prisma.user.findUnique({
    where:   { id: requesterId },
    include: { role: true },
  });
  if (!requester) throw AppError.unauthorized();

  if (media.uploadedById !== requesterId && requester.role.name !== "ADMIN") {
    throw AppError.forbidden("You can only delete your own files");
  }

  // Delete from Cloudinary
  if (media.publicId) {
    const cloudinaryType = getCloudinaryResourceType(media.mimeType);
    await cloudinary.uploader
      .destroy(media.publicId, { resource_type: cloudinaryType })
      .catch(() => null);
  }

  await prisma.media.delete({ where: { id } });
}

// ─── Queries ──────────────────────────────────────────────────

export async function getMediaById(id: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw AppError.notFound("Media not found");
  return media;
}

export async function getUserMedia(userId: string) {
  return prisma.media.findMany({
    where:   { uploadedById: userId },
    orderBy: { createdAt: "desc" },
  });
}
