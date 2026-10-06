import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";

export interface UpdateStaffStatusDto {
  status:     "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "RESIGNED" | "RETIRED";
  leavingDate?: Date;
  note?:      string;
}

export interface CreateLeaveRequestDto {
  type:        "SICK" | "CASUAL" | "ANNUAL" | "MATERNITY" | "PATERNITY" | "UNPAID";
  fromDate:    Date;
  toDate:      Date;
  reason:      string;
}

export interface ReviewLeaveDto {
  status:  "APPROVED" | "REJECTED";
  remarks?: string;
}

// ─── Staff Queries ────────────────────────────────────────────

export async function getAllStaff(params: {
  page:         number;
  limit:        number;
  departmentId?: string;
  role?:        string;
  status?:      string;
  search?:      string;
}) {
  const { page, limit, departmentId, role, status, search } = params;
  const skip = (page - 1) * limit;

  const where = {
    role: { name: { not: "STUDENT" as const } },
    ...(role         && { role: { name: role as "ADMIN" } }),
    ...(departmentId && { staffProfile: { departmentId } }),
    ...(status       && { staffProfile: { status: status as "ACTIVE" } }),
    ...(search       && {
      OR: [
        { username: { contains: search, mode: "insensitive" as const } },
        { staffProfile: { firstName:  { contains: search, mode: "insensitive" as const } } },
        { staffProfile: { lastName:   { contains: search, mode: "insensitive" as const } } },
        { staffProfile: { employeeId: { contains: search, mode: "insensitive" as const } } },
        { staffProfile: { cnic:       { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [staff, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, email: true,
        collegeEmail: true, isActive: true,
        role: { select: { name: true, displayName: true } },
        staffProfile: {
          select: {
            id: true, employeeId: true,
            firstName: true, lastName: true,
            designation: true, qualification: true,
            status: true, joiningDate: true, phone: true,
            department: { select: { name: true, code: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { staff, total };
}

export async function getStaffById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { select: { name: true, displayName: true } },
      staffProfile: {
        include: {
          department: true,
          courseTeachers: {
            include: {
              section: {
                include: {
                  course:   { select: { name: true, code: true } },
                  semester: { select: { semesterNumber: true, type: true, isActive: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.staffProfile) throw AppError.notFound("Staff member not found");
  return user;
}

export async function getDepartmentStaff(departmentId: string) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw AppError.notFound("Department not found");

  return prisma.user.findMany({
    where: {
      staffProfile: { departmentId },
      isActive:     true,
    },
    select: {
      id: true,
      role: { select: { name: true, displayName: true } },
      staffProfile: {
        select: {
          id: true, employeeId: true,
          firstName: true, lastName: true,
          designation: true, status: true,
          courseTeachers: {
            include: {
              section: { include: { course: { select: { name: true, code: true } } } },
            },
          },
        },
      },
    },
    orderBy: { staffProfile: { firstName: "asc" } },
  });
}

export async function updateStaffStatus(userId: string, dto: UpdateStaffStatusDto) {
  const profile = await prisma.staffProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Staff profile not found");

  const updateData = {
    status:      dto.status,
    ...(dto.leavingDate && { leavingDate: dto.leavingDate }),
  };

  const updated = await prisma.staffProfile.update({
    where: { userId },
    data:  updateData,
  });

  // Deactivate user account on resignation/retirement/suspension
  if (["RESIGNED", "RETIRED", "SUSPENDED"].includes(dto.status)) {
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  }

  if (dto.status === "ACTIVE") {
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  }

  return updated;
}

// ─── Leave Requests ───────────────────────────────────────────

export async function createLeaveRequest(userId: string, dto: CreateLeaveRequestDto) {
  const profile = await prisma.staffProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Staff profile not found");

  if (dto.fromDate > dto.toDate) throw AppError.badRequest("From date must be before to date");

  // Store as a notification/audit entry — simple approach for FYP
  // A full leave management system would have a separate leave table
  // For now we log it as an audit entry and update status
  const days = Math.ceil(
    (dto.toDate.getTime() - dto.fromDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  await prisma.auditLog.create({
    data: {
      userId,
      action:   "LEAVE_REQUEST",
      module:   "staff",
      entityId: profile.id,
      newData: {
        type:     dto.type,
        fromDate: dto.fromDate,
        toDate:   dto.toDate,
        days,
        reason:   dto.reason,
        status:   "PENDING",
      },
    },
  });

  return {
    message: "Leave request submitted. Pending approval from HOD/Admin.",
    type:    dto.type,
    fromDate: dto.fromDate,
    toDate:   dto.toDate,
    days,
    reason:  dto.reason,
    status:  "PENDING",
  };
}

// ─── Staff Workload ───────────────────────────────────────────

export async function getStaffWorkload(userId: string) {
  const profile = await prisma.staffProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Staff profile not found");

  const sections = await prisma.section.findMany({
    where: {
      teachers: { some: { staffProfileId: profile.id } },
      semester: { isActive: true },
    },
    include: {
      course:   { select: { name: true, code: true, creditHours: true } },
      semester: { select: { semesterNumber: true, type: true } },
      _count:   { select: { enrollments: true, attendanceSessions: true } },
    },
  });

  const totalCreditHours = sections.reduce(
    (sum: number, s: { course: { creditHours: number } }) => sum + s.course.creditHours,
    0
  );

  return { sections, totalCreditHours, totalSections: sections.length };
}
