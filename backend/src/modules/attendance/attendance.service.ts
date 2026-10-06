import { prisma } from "../../config/database";
import { emitToSection, SOCKET_EVENTS } from "../../lib/socket";
import { AppError } from "../../utils/app-error";

export interface MarkAttendanceDto {
  sectionId: string;
  date:      string;   // "YYYY-MM-DD"
  topic?:    string;
  records: {
    studentProfileId: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
  }[];
}

export interface UpdateAttendanceRecordDto {
  status:   "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks?: string;
}

// ─── Mark Attendance ──────────────────────────────────────────

export async function markAttendance(dto: MarkAttendanceDto, markedById: string) {
  const section = await prisma.section.findUnique({ where: { id: dto.sectionId } });
  if (!section) throw AppError.notFound("Section not found");

  const date = new Date(dto.date);
  date.setUTCHours(0, 0, 0, 0);

  // Check if session already marked for this date
  const existing = await prisma.attendanceSession.findUnique({
    where: { sectionId_date: { sectionId: dto.sectionId, date } },
  });
  if (existing) throw AppError.conflict("Attendance already marked for this section on this date");

  // Verify all students are enrolled in the section
  const enrolledIds = await prisma.enrollment.findMany({
    where: { sectionId: dto.sectionId, isActive: true },
    select: { studentProfileId: true },
  });
  const enrolledSet = new Set(enrolledIds.map((e: { studentProfileId: string }) => e.studentProfileId));

  for (const rec of dto.records) {
    if (!enrolledSet.has(rec.studentProfileId)) {
      throw AppError.badRequest(`Student ${rec.studentProfileId} is not enrolled in this section`);
    }
  }

  const attendanceSession = await prisma.attendanceSession.create({
    data: {
      sectionId:   dto.sectionId,
      date,
      topic:       dto.topic,
      markedById,
      records: {
        create: dto.records.map((r) => ({
          studentProfileId: r.studentProfileId,
          status:           r.status,
          remarks:          r.remarks,
        })),
      },
    },
    include: { records: true },
  });

  // Notify section room — frontend refreshes attendance list live
  emitToSection(dto.sectionId, SOCKET_EVENTS.ATTENDANCE_MARKED, {
    sectionId:   dto.sectionId,
    date:        dto.date,
    recordCount: dto.records.length,
  });

  return attendanceSession;
}

// ─── Update single record ─────────────────────────────────────

export async function updateAttendanceRecord(
  recordId: string,
  dto: UpdateAttendanceRecordDto
) {
  const record = await prisma.attendanceRecord.findUnique({ where: { id: recordId } });
  if (!record) throw AppError.notFound("Attendance record not found");
  return prisma.attendanceRecord.update({ where: { id: recordId }, data: dto });
}

// ─── Get session with records ─────────────────────────────────

export async function getSessionById(id: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      section: { include: { course: { select: { name: true, code: true } } } },
      records: {
        include: {
          studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } },
        },
        orderBy: { studentProfile: { registrationNo: "asc" } },
      },
    },
  });
  if (!session) throw AppError.notFound("Attendance session not found");
  return session;
}

export async function getSectionAttendanceSessions(sectionId: string, params: {
  from?: Date; to?: Date;
}) {
  return prisma.attendanceSession.findMany({
    where: {
      sectionId,
      ...(params.from && { date: { gte: params.from } }),
      ...(params.to   && { date: { lte: params.to } }),
    },
    orderBy: { date: "desc" },
    include: { _count: { select: { records: true } } },
  });
}

// ─── Student Attendance Report ────────────────────────────────

export async function getStudentAttendanceReport(params: {
  userId:    string;
  sectionId?: string;
  from?:     Date;
  to?:       Date;
}) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId: params.userId } });
  if (!profile) throw AppError.notFound("Student not found");

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentProfileId: profile.id,
      ...(params.sectionId && { attendanceSession: { sectionId: params.sectionId } }),
      ...(params.from      && { attendanceSession: { date: { gte: params.from } } }),
      ...(params.to        && { attendanceSession: { date: { lte: params.to }   } }),
    },
    include: {
      attendanceSession: {
        include: { section: { include: { course: { select: { name: true, code: true } } } } },
      },
    },
    orderBy: { attendanceSession: { date: "desc" } },
  });

  // Summary stats
  const total   = records.length;
  const present = records.filter((r: { status: string }) => r.status === "PRESENT").length;
  const absent  = records.filter((r: { status: string }) => r.status === "ABSENT").length;
  const late    = records.filter((r: { status: string }) => r.status === "LATE").length;
  const excused = records.filter((r: { status: string }) => r.status === "EXCUSED").length;

  return {
    summary: {
      total,
      present,
      absent,
      late,
      excused,
      percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
    },
    records,
  };
}

// ─── Section attendance summary ───────────────────────────────

export async function getSectionAttendanceSummary(sectionId: string) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { _count: { select: { attendanceSessions: true } } },
  });
  if (!section) throw AppError.notFound("Section not found");

  const totalSessions = section._count.attendanceSessions;

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, isActive: true },
    include: {
      studentProfile: {
        select: { id: true, registrationNo: true, firstName: true, lastName: true },
      },
    },
  });

  const summaries = await Promise.all(
    enrollments.map(async (enrollment: { studentProfileId: string; studentProfile: { id: string; registrationNo: string; firstName: string; lastName: string } }) => {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          studentProfileId: enrollment.studentProfileId,
          attendanceSession: { sectionId },
        },
      });

      const present = records.filter((r: { status: string }) => r.status === "PRESENT" || r.status === "LATE").length;
      const percentage = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;

      return {
        student: enrollment.studentProfile,
        present,
        absent:  records.filter((r: { status: string }) => r.status === "ABSENT").length,
        late:    records.filter((r: { status: string }) => r.status === "LATE").length,
        totalSessions,
        percentage,
        isAtRisk: percentage < 75,
      };
    })
  );

  return { totalSessions, students: summaries };
}
