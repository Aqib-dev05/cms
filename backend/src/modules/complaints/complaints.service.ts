import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";

export interface CreateComplaintDto {
  title:       string;
  description: string;
  categoryId:  string;
}

export interface AssignComplaintDto {
  assignedToId: string;
  note?:        string;
}

export interface UpdateStatusDto {
  status: "UNDER_REVIEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
  note?:  string;
}

export interface AddCommentDto {
  content:    string;
  isInternal: boolean;
}

// ─── Categories ───────────────────────────────────────────────

export async function getCategories() {
  return prisma.complaintCategory.findMany({ orderBy: { name: "asc" } });
}

// ─── Complaints ───────────────────────────────────────────────

export async function getComplaints(params: {
  page:       number;
  limit:      number;
  status?:    string;
  categoryId?: string;
  createdById?: string;
}) {
  const { page, limit, status, categoryId, createdById } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(status     && { status: status as "SUBMITTED" }),
    ...(categoryId && { categoryId }),
    ...(createdById && { createdById }),
  };

  const [complaints, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category:  { select: { name: true, routeToRole: true } },
        createdBy: { select: { username: true, studentProfile: { select: { firstName: true, lastName: true, registrationNo: true } } } },
        _count:    { select: { comments: true } },
      },
    }),
    prisma.complaint.count({ where }),
  ]);

  return { complaints, total };
}

export interface ComplaintActor {
  userId:   string;
  roleName: string;
}

export async function getComplaintById(id: string, actor?: ComplaintActor) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      category:  true,
      createdBy: {
        select: {
          username: true,
          studentProfile: { select: { firstName: true, lastName: true, registrationNo: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!complaint) throw AppError.notFound("Complaint not found");

  if (actor?.roleName === "STUDENT") {
    // Students only see their own complaints, and never internal staff notes.
    // 404 (not 403) so complaint ids can't be probed.
    if (complaint.createdById !== actor.userId) throw AppError.notFound("Complaint not found");
    return { ...complaint, comments: complaint.comments.filter((c: { isInternal: boolean }) => !c.isInternal) };
  }
  return complaint;
}

export async function createComplaint(dto: CreateComplaintDto, createdById: string) {
  const category = await prisma.complaintCategory.findUnique({ where: { id: dto.categoryId } });
  if (!category) throw AppError.notFound("Complaint category not found");

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: createdById } });

  const complaint = await prisma.complaint.create({
    data: {
      title:           dto.title,
      description:     dto.description,
      categoryId:      dto.categoryId,
      createdById,
      studentProfileId: studentProfile?.id,
      status:          "SUBMITTED",
    },
    include: {
      category: { select: { name: true, routeToRole: true } },
    },
  });

  // Log initial status
  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: complaint.id,
      toStatus:    "SUBMITTED",
      changedById: createdById,
      note:        "Complaint submitted",
    },
  });

  return complaint;
}

export async function assignComplaint(id: string, dto: AssignComplaintDto, assignedById: string) {
  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) throw AppError.notFound("Complaint not found");

  if (complaint.status === "CLOSED" || complaint.status === "RESOLVED") {
    throw AppError.badRequest("Cannot reassign a closed or resolved complaint");
  }

  const assignee = await prisma.user.findUnique({ where: { id: dto.assignedToId } });
  if (!assignee) throw AppError.notFound("Assignee not found");

  await prisma.$transaction([
    prisma.complaint.update({
      where: { id },
      data:  { assignedToId: dto.assignedToId, status: "UNDER_REVIEW" },
    }),
    prisma.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus:  complaint.status,
        toStatus:    "UNDER_REVIEW",
        changedById: assignedById,
        note:        dto.note ?? `Assigned to user`,
      },
    }),
  ]);

  return prisma.complaint.findUnique({ where: { id } });
}

export async function updateComplaintStatus(id: string, dto: UpdateStatusDto, changedById: string) {
  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) throw AppError.notFound("Complaint not found");

  if (complaint.status === "CLOSED") {
    throw AppError.badRequest("Complaint is already closed");
  }

  await prisma.$transaction([
    prisma.complaint.update({
      where: { id },
      data:  { status: dto.status },
    }),
    prisma.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus:  complaint.status,
        toStatus:    dto.status,
        changedById,
        note:        dto.note,
      },
    }),
  ]);

  return prisma.complaint.findUnique({ where: { id } });
}

export async function addComment(id: string, dto: AddCommentDto, actor: ComplaintActor) {
  const authorId = actor.userId;
  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) throw AppError.notFound("Complaint not found");
  if (complaint.status === "CLOSED") throw AppError.badRequest("Cannot comment on a closed complaint");

  const isStudent = actor.roleName === "STUDENT";
  if (isStudent && complaint.createdById !== authorId) throw AppError.notFound("Complaint not found");

  return prisma.complaintComment.create({
    data: {
      complaintId: id,
      authorId,
      content:    dto.content,
      isInternal: isStudent ? false : dto.isInternal,
    },
  });
}

export async function getComplaintStats() {
  const [byStatus, byCategory, recentOverdue] = await Promise.all([
    prisma.complaint.groupBy({
      by:     ["status"],
      _count: { id: true },
    }),
    prisma.complaint.groupBy({
      by:     ["categoryId"],
      _count: { id: true },
    }),
    prisma.complaint.findMany({
      where: {
        status:    { notIn: ["RESOLVED", "CLOSED", "REJECTED"] },
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, title: true, status: true, createdAt: true },
    }),
  ]);

  return { byStatus, byCategory, overdueCount: recentOverdue.length };
}
