import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { emitToAll, emitToRole, emitToUsers, SOCKET_EVENTS } from "../../lib/socket";

const STAFF_ROLES = ["ADMIN", "HOD", "TEACHER", "HEAD_CLERK", "CLERK", "COMPLAINT_OFFICER", "LIBRARIAN"] as const;

/** Push a "notice published" event to everyone the notice is aimed at. */
async function broadcastNotice(notice: {
  id: string; title: string; category: string | null;
  audience: "ALL" | "STUDENTS" | "STAFF" | "DEPARTMENT" | "PROGRAM";
  departmentId: string | null; programId: string | null;
}) {
  const payload = { id: notice.id, title: notice.title, category: notice.category, audience: notice.audience };
  const ev = SOCKET_EVENTS.NOTICE_PUBLISHED;

  switch (notice.audience) {
    case "ALL":
      emitToAll(ev, payload);
      break;
    case "STUDENTS":
      emitToRole("STUDENT", ev, payload);
      break;
    case "STAFF":
      for (const role of STAFF_ROLES) emitToRole(role, ev, payload);
      break;
    case "DEPARTMENT": {
      if (!notice.departmentId) break;
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { staffProfile:   { departmentId: notice.departmentId } },
            { studentProfile: { program: { departmentId: notice.departmentId } } },
          ],
        },
        select: { id: true },
      });
      emitToUsers(users.map((u: { id: string }) => u.id), ev, payload);
      break;
    }
    case "PROGRAM": {
      if (!notice.programId) break;
      const users = await prisma.user.findMany({
        where: { isActive: true, studentProfile: { programId: notice.programId } },
        select: { id: true },
      });
      emitToUsers(users.map((u: { id: string }) => u.id), ev, payload);
      break;
    }
  }
}

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
  const notice = await prisma.notice.create({
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
  if (notice.isPublished) await broadcastNotice(notice);
  return notice;
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
  const published = await prisma.notice.update({
    where: { id },
    data:  { isPublished: true, publishedAt: new Date() },
  });
  await broadcastNotice(published);
  return published;
}

export async function deleteNotice(id: string) {
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw AppError.notFound("Notice not found");
  await prisma.notice.delete({ where: { id } });
}
