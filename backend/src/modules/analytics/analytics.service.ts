import { prisma } from "../../config/database";
import type {
  AnalyticsOverview,
  AttendanceTrendPoint,
  EnrollmentByProgram,
  FeeTrendPoint,
} from "./analytics.types";
import {
  AT_RISK_MIN_RECORDS,
  AT_RISK_THRESHOLD,
  AT_RISK_WINDOW_DAYS,
  attendanceRate,
  buildMonthKeys,
  dateOnlyMonthStart,
  localMonthStart,
  monthKeyLocal,
  monthKeyUtc,
  round1,
  summariseAttendance,
} from "./analytics.utils";

const OPEN_FEE_STATUSES = ["UNPAID", "PARTIAL", "OVERDUE"] as const;
const OPEN_COMPLAINT_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS"] as const;
const PENDING_ADMISSION_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] as const;

// ─── Overview ────────────────────────────────────────────────

export async function getOverview(now: Date = new Date()): Promise<AnalyticsOverview> {
  const monthStart = localMonthStart(now, 0);
  const nextMonthStart = localMonthStart(now, 1);
  const attMonthStart = dateOnlyMonthStart(now, 0);
  const attNextMonthStart = dateOnlyMonthStart(now, 1);

  const [
    activeStudents,
    activeStaff,
    departments,
    programs,
    collected,
    outstanding,
    overdueInvoices,
    attendanceThisMonth,
    atRiskStudents,
    openComplaints,
    pendingAdmissions,
    booksIssued,
    booksOverdue,
  ] = await Promise.all([
    prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    prisma.staffProfile.count({ where: { status: "ACTIVE" } }),
    prisma.department.count({ where: { isActive: true } }),
    prisma.program.count({ where: { isActive: true } }),
    prisma.feePayment.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: monthStart, lt: nextMonthStart } },
    }),
    prisma.feeInvoice.aggregate({
      _sum: { dueAmount: true },
      where: { status: { in: [...OPEN_FEE_STATUSES] } },
    }),
    prisma.feeInvoice.count({
      where: { status: { in: [...OPEN_FEE_STATUSES] }, dueDate: { lt: now } },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { attendanceSession: { date: { gte: attMonthStart, lt: attNextMonthStart } } },
    }),
    countAtRiskStudents(now),
    prisma.complaint.count({ where: { status: { in: [...OPEN_COMPLAINT_STATUSES] } } }),
    prisma.application.count({ where: { status: { in: [...PENDING_ADMISSION_STATUSES] } } }),
    prisma.bookIssue.count({ where: { returnedAt: null } }),
    prisma.bookIssue.count({ where: { returnedAt: null, dueDate: { lt: now } } }),
  ]);

  const { attended, total } = summariseAttendance(
    attendanceThisMonth.map((r) => ({ status: r.status, count: r._count._all }))
  );

  return {
    generatedAt: now.toISOString(),
    students: { active: activeStudents },
    staff: { active: activeStaff },
    academics: { departments, programs },
    fees: {
      collectedThisMonth: collected._sum.amount ?? 0,
      outstanding: outstanding._sum.dueAmount ?? 0,
      overdueInvoices,
    },
    attendance: { rateThisMonth: attendanceRate(attended, total), atRiskStudents },
    complaints: { open: openComplaints },
    admissions: { pending: pendingAdmissions },
    library: { issued: booksIssued, overdue: booksOverdue },
  };
}

/** Active students under the attendance threshold over the last 90 days. */
async function countAtRiskStudents(now: Date): Promise<number> {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - AT_RISK_WINDOW_DAYS);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.attendanceRecord.groupBy({
    by: ["studentProfileId", "status"],
    _count: { _all: true },
    where: {
      attendanceSession: { date: { gte: since } },
      studentProfile: { status: "ACTIVE" },
    },
  });

  const perStudent = new Map<string, { status: string; count: number }[]>();
  for (const r of rows) {
    const list = perStudent.get(r.studentProfileId) ?? [];
    list.push({ status: r.status, count: r._count._all });
    perStudent.set(r.studentProfileId, list);
  }

  let atRisk = 0;
  for (const counts of perStudent.values()) {
    const { attended, total } = summariseAttendance(counts);
    if (total >= AT_RISK_MIN_RECORDS && (attended / total) * 100 < AT_RISK_THRESHOLD) atRisk++;
  }
  return atRisk;
}

// ─── Trends ──────────────────────────────────────────────────

export async function getFeeTrend(months: number, now: Date = new Date()): Promise<FeeTrendPoint[]> {
  const keys = buildMonthKeys(months, now);
  const since = localMonthStart(now, -(months - 1));

  const [payments, invoices] = await Promise.all([
    prisma.feePayment.findMany({
      where: { paidAt: { gte: since } },
      select: { amount: true, paidAt: true },
    }),
    prisma.feeInvoice.findMany({
      where: { issuedAt: { gte: since } },
      select: { totalAmount: true, discountAmount: true, issuedAt: true },
    }),
  ]);

  const points = new Map<string, FeeTrendPoint>(keys.map((month) => [month, { month, collected: 0, billed: 0 }]));

  for (const p of payments) {
    const point = points.get(monthKeyLocal(p.paidAt));
    if (point) point.collected += p.amount;
  }
  for (const i of invoices) {
    const point = points.get(monthKeyLocal(i.issuedAt));
    if (point) point.billed += i.totalAmount - i.discountAmount;
  }

  return keys.map((k) => {
    const p = points.get(k)!;
    return { month: k, collected: round1(p.collected), billed: round1(p.billed) };
  });
}

export async function getAttendanceTrend(months: number, now: Date = new Date()): Promise<AttendanceTrendPoint[]> {
  const keys = buildMonthKeys(months, now);
  const since = dateOnlyMonthStart(now, -(months - 1));

  const [sessions, grouped] = await Promise.all([
    prisma.attendanceSession.findMany({ where: { date: { gte: since } }, select: { id: true, date: true } }),
    prisma.attendanceRecord.groupBy({
      by: ["attendanceSessionId", "status"],
      _count: { _all: true },
      where: { attendanceSession: { date: { gte: since } } },
    }),
  ]);

  const sessionMonth = new Map(sessions.map((s) => [s.id, monthKeyUtc(s.date)]));
  const perMonth = new Map<string, { status: string; count: number }[]>(keys.map((k) => [k, []]));

  for (const g of grouped) {
    const month = sessionMonth.get(g.attendanceSessionId);
    if (month) perMonth.get(month)?.push({ status: g.status, count: g._count._all });
  }

  return keys.map((month) => {
    const { attended, total } = summariseAttendance(perMonth.get(month) ?? []);
    return { month, rate: attendanceRate(attended, total), records: total };
  });
}

// ─── Enrollment ──────────────────────────────────────────────

export async function getEnrollmentByProgram(): Promise<EnrollmentByProgram[]> {
  const programs = await prisma.program.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      _count: { select: { studentProfiles: { where: { status: "ACTIVE" } } } },
    },
  });

  return programs.map((p) => ({
    programId: p.id,
    code: p.code,
    name: p.name,
    students: p._count.studentProfiles,
  }));
}
