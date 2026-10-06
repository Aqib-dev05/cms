import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";

export interface CreateNoticeDto {
  title:        string;
  content:      string;
  category?:    string;
  audience:     "ALL" | "STUDENTS" | "STAFF" | "DEPARTMENT" | "PROGRAM";
  departmentId?: string;
  programId?:   string;
  expiresAt?:   Date;
  publishNow?:  boolean;
}

export interface UpdateNoticeDto {
  title?:       string;
  content?:     string;
  category?:    string;
  audience?:    "ALL" | "STUDENTS" | "STAFF" | "DEPARTMENT" | "PROGRAM";
  departmentId?: string;
  programId?:   string;
  expiresAt?:   Date;
}

export async function getNotices(params: {
  page:      number;
  limit:     number;
  audience?: string;
  category?: string;
  active?:   boolean;
}) {
  const { page, limit, audience, category, active } = params;
  const skip  = (page - 1) * limit;
  const now   = new Date();

  const where = {
    isPublished: true,
    ...(audience && { audience: audience as "ALL" }),
    ...(category && { category }),
    ...(active && {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    }),
  };

  const [notices, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { publishedAt: "desc" },
      include: {
        createdBy: { select: { username: true, staffProfile: { select: { firstName: true, lastName: true } } } },
        _count: { select: { media: true } },
      },
    }),
    prisma.notice.count({ where }),
  ]);

  return { notices, total };
}

export async function getNoticeById(id: string) {
  const notice = await prisma.notice.findUnique({
    where: { id },
    include: {
      createdBy: { select: { username: true, staffProfile: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!notice) throw AppError.notFound("Notice not found");
  return notice;
}

export async function createNotice(dto: CreateNoticeDto, createdById: string) {
  return prisma.notice.create({
    data: {
      title:       dto.title,
      content:     dto.content,
      category:    dto.category,
      audience:    dto.audience,
      departmentId: dto.departmentId,
      programId:   dto.programId,
      expiresAt:   dto.expiresAt,
      createdById,
      isPublished: dto.publishNow ?? false,
      publishedAt: dto.publishNow ? new Date() : null,
    },
  });
}

export async function updateNotice(id: string, dto: UpdateNoticeDto) {
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw AppError.notFound("Notice not found");
  return prisma.notice.update({ where: { id }, data: dto });
}

export async function publishNotice(id: string) {
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw AppError.notFound("Notice not found");
  if (notice.isPublished) throw AppError.badRequest("Notice is already published");
  return prisma.notice.update({
    where: { id },
    data:  { isPublished: true, publishedAt: new Date() },
  });
}

export async function deleteNotice(id: string) {
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw AppError.notFound("Notice not found");
  await prisma.notice.delete({ where: { id } });
}
