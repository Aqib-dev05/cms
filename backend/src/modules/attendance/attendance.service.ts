import { prisma } from "../../config/database";
import { emitToSection, SOCKET_EVENTS } from "../../lib/socket";
import { AppError } from "../../utils/app-error";
import { audit, AUDIT_ACTIONS } from "../../utils/audit-logger";
import {
  assertCanManageSection,
  assertNotFuture,
  assertWithinEditWindow,
  type Actor,
} from "./attendance.access";

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

export async function markAttendance(dto: MarkAttendanceDto, actor: Actor) {
  await assertCanManageSection(actor, dto.sectionId);

  const date = new Date(dto.date);
  date.setUTCHours(0, 0, 0, 0);
  assertNotFuture(date);
  assertWithinEditWindow(actor, date);

  // Check if session already marked for this date
  const existing = await prisma.attendanceSession.findUnique({
    where: { sectionId_date: { sectionId: dto.sectionId, date } },
  });
  if (existing) throw AppError.conflict("Attendance already marked for this section on this date");

  // Verify all students are enrolled in the section (and listed only once)
  const enrolledIds = await prisma.enrollment.findMany({
    where: { sectionId: dto.sectionId, isActive: true },
    select: { studentProfileId: true },
  });
  const enrolledSet = new Set(enrolledIds.map((e: { studentProfileId: string }) => e.studentProfileId));
  const seen = new Set<string>();

  for (const rec of dto.records) {
    if (!enrolledSet.has(rec.studentProfileId)) {
      throw AppError.badRequest(`Student ${rec.studentProfileId} is not enrolled in this section`);
    }
    if (seen.has(rec.studentProfileId)) {
      throw AppError.badRequest(`Student ${rec.studentProfileId} is listed more than once`);
    }
    seen.add(rec.studentProfileId);
  }

  const attendanceSession = await prisma.attendanceSession.create({
    data: {
      sectionId:   dto.sectionId,
      date,
      topic:       dto.topic,
      markedById:  actor.userId,
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

  await audit({
    userId:   actor.userId,
    action:   AUDIT_ACTIONS.ATTENDANCE_MARK,
    module:   "attendance",
    entityId: attendanceSession.id,
    newData:  { sectionId: dto.sectionId, date: dto.date, recordCount: dto.records.length },
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
  dto: UpdateAttendanceRecordDto,
  actor: Actor
) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { attendanceSession: { select: { id: true, sectionId: true, date: true } } },
  });
  if (!record) throw AppError.notFound("Attendance record not found");

  const { sectionId, date, id: sessionId } = record.attendanceSession;
  await assertCanManageSection(actor, sectionId);
  assertWithinEditWindow(actor, date);

  const updated = await prisma.attendanceRecord.update({
    where: { id: recordId },
    data:  { status: dto.status, ...(dto.remarks !== undefined && { remarks: dto.remarks }) },
  });

  // Attendance is grade-sensitive: keep who changed what.
  await audit({
    userId:   actor.userId,
    action:   AUDIT_ACTIONS.ATTENDANCE_UPDATE,
    module:   "attendance",
    entityId: recordId,
    oldData:  { status: record.status, remarks: record.remarks, sessionId, sectionId, date: date.toISOString().slice(0, 10) },
    newData:  { status: updated.status, remarks: updated.remarks },
  });

  emitToSection(sectionId, SOCKET_EVENTS.ATTENDANCE_UPDATED, {
    sectionId,
    sessionId,
    recordId,
    studentProfileId: record.studentProfileId,
    status:           updated.status,
  });

  return updated;
}

// ─── Get session with records ─────────────────────────────────

export async function getSessionById(id: string, actor: Actor) {
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
  await assertCanManageSection(actor, session.sectionId);
  return session;
}

export async function getSectionAttendanceSessions(
  sectionId: string,
  params: { from?: Date; to?: Date },
  actor: Actor
) {
  await assertCanManageSection(actor, sectionId);
  return prisma.attendanceSession.findMany({
    where: {
      sectionId,
      ...((params.from || params.to) && {
        date: { ...(params.from && { gte: params.from }), ...(params.to && { lte: params.to }) },
      }),
    },
    orderBy: { date: "desc" },
    include: { _count: { select: { records: true } } },
  });
}

// ─── Student Attendance Report ────────────────────────────────
// Callers must have checked access (own data, or assertCanViewStudent).

export async function getStudentAttendanceReport(params: {
  userId:     string;
  sectionId?: string;
  from?:      Date;
  to?:        Date;
}) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId: params.userId } });
  if (!profile) throw AppError.notFound("Student not found");

  const sessionWhere = {
    ...(params.sectionId && { sectionId: params.sectionId }),
    ...((params.from || params.to) && {
      date: { ...(params.from && { gte: params.from }), ...(params.to && { lte: params.to }) },
    }),
  };

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentProfileId: profile.id,
      ...(Object.keys(sessionWhere).length > 0 && { attendanceSession: sessionWhere }),
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

export async function getSectionAttendanceSummary(sectionId: string, actor: Actor) {
  await assertCanManageSection(actor, sectionId);

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

  // One query for the whole section instead of one per student
  const allRecords = await prisma.attendanceRecord.findMany({
    where: { attendanceSession: { sectionId } },
    select: { studentProfileId: true, status: true },
  });
  const byStudent = new Map<string, { status: string }[]>();
  for (const r of allRecords) {
    const list = byStudent.get(r.studentProfileId) ?? [];
    list.push(r);
    byStudent.set(r.studentProfileId, list);
  }

  const students = enrollments.map((enrollment: { studentProfileId: string; studentProfile: { id: string; registrationNo: string; firstName: string; lastName: string } }) => {
    const records = byStudent.get(enrollment.studentProfileId) ?? [];
    const present = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    const percentage = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;
    return {
      student: enrollment.studentProfile,
      present,
      absent:  records.filter((r) => r.status === "ABSENT").length,
      late:    records.filter((r) => r.status === "LATE").length,
      totalSessions,
      percentage,
      isAtRisk: percentage < 75,
    };
  });

  return { totalSessions, students };
}
