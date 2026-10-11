import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { assertCanManageSection, type Actor } from "../attendance/attendance.access";
import { getSectionAttendanceSummary, getStudentAttendanceReport } from "../attendance/attendance.service";
import { getStudentGradeReport } from "../exams/exams.service";
import { getStudents } from "../students/students.service";
import { getDefaulters } from "../finance/finance.service";
import { listEntries } from "../fund/fund.service";
import { listAssistants } from "../clerk/clerk.service";
import { slug, type ExportTable } from "./export.engine";

export interface ExportQuery {
  from?: Date;
  to?: Date;
  status?: string;
  type?: string;
  programId?: string;
  semesterId?: string;
  sectionId?: string;
  examId?: string;
  search?: string;
}

export interface ResourceDef {
  label: string;
  /** exact roles allowed (e.g. a student's own records) */
  roles?: string[];
  /** or a permission code the user must hold */
  permission?: string;
  build: (actor: Actor, q: ExportQuery) => Promise<ExportTable>;
}

const MAX_ROWS = 10_000;
const today = () => new Date().toISOString().slice(0, 10);
const range = (q: ExportQuery) => (q.from || q.to ? `${q.from ? q.from.toISOString().slice(0, 10) : "…"} to ${q.to ? q.to.toISOString().slice(0, 10) : "…"}` : undefined);
const dateWhere = (q: ExportQuery) => (q.from || q.to ? { ...(q.from && { gte: q.from }), ...(q.to && { lte: q.to }) } : undefined);
const person = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

async function ownProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true, registrationNo: true, firstName: true, lastName: true, program: { select: { name: true } } },
  });
  if (!profile) throw AppError.notFound("Student profile not found");
  return profile;
}

export const RESOURCES: Record<string, ResourceDef> = {
  // ── Student: own records ────────────────────────────────────
  "my-fees": {
    label: "My fee record",
    roles: ["STUDENT"],
    build: async (actor) => {
      const p = await ownProfile(actor.userId);
      const invoices = await prisma.feeInvoice.findMany({ where: { studentProfileId: p.id }, orderBy: { issuedAt: "desc" } });
      const sum = (k: "totalAmount" | "paidAmount" | "dueAmount") => invoices.reduce((s: number, i: { [x: string]: unknown }) => s + (i[k] as number), 0);
      return {
        filename: `fee-record-${slug(p.registrationNo)}`,
        title: "Fee record",
        subtitle: `${person(p)} · ${p.registrationNo} · ${p.program.name}`,
        columns: [
          { key: "invoiceNo", header: "Invoice", width: 18 }, { key: "semester", header: "Term", width: 16 },
          { key: "issuedAt", header: "Issued", format: "date", width: 14 }, { key: "dueDate", header: "Due date", format: "date", width: 14 },
          { key: "totalAmount", header: "Total", format: "currency", width: 14 }, { key: "discountAmount", header: "Discount", format: "currency", width: 12 },
          { key: "paidAmount", header: "Paid", format: "currency", width: 14 }, { key: "dueAmount", header: "Balance", format: "currency", width: 14 },
          { key: "status", header: "Status", width: 12 },
        ],
        rows: invoices,
        summary: [
          { label: "Total billed", value: `PKR ${sum("totalAmount").toLocaleString("en-PK")}` },
          { label: "Total paid", value: `PKR ${sum("paidAmount").toLocaleString("en-PK")}` },
          { label: "Balance due", value: `PKR ${sum("dueAmount").toLocaleString("en-PK")}` },
        ],
      };
    },
  },

  "my-attendance": {
    label: "My attendance",
    roles: ["STUDENT"],
    build: async (actor, q) => {
      const p = await ownProfile(actor.userId);
      const report = await getStudentAttendanceReport({ userId: actor.userId, sectionId: q.sectionId, from: q.from, to: q.to });
      const rows = (report.records as { status: string; attendanceSession: { date: Date; section: { course: { code: string; name: string } } } }[]).map((r) => ({
        date: r.attendanceSession.date, code: r.attendanceSession.section.course.code, course: r.attendanceSession.section.course.name, status: r.status,
      }));
      const s = report.summary;
      return {
        filename: `attendance-${slug(p.registrationNo)}-${today()}`,
        title: "Attendance record",
        subtitle: [`${person(p)} · ${p.registrationNo}`, range(q)].filter(Boolean).join(" · "),
        columns: [{ key: "date", header: "Date", format: "date", width: 14 }, { key: "code", header: "Code", width: 12 }, { key: "course", header: "Course", width: 34 }, { key: "status", header: "Status", width: 12 }],
        rows,
        summary: [
          { label: "Classes", value: String(s.total) }, { label: "Present", value: String(s.present) }, { label: "Late", value: String(s.late) },
          { label: "Absent", value: String(s.absent) }, { label: "Excused", value: String(s.excused) }, { label: "Attendance", value: `${s.percentage}%` },
        ],
      };
    },
  },

  "my-marksheet": {
    label: "My mark sheet",
    roles: ["STUDENT"],
    build: async (actor, q) => {
      const p = await ownProfile(actor.userId);
      const report = await getStudentGradeReport(actor.userId, q.semesterId);
      const rows = report.courses.map((c: { course: { code: string; name: string; creditHours: number }; exams: { isAbsent: boolean; marksObtained: number; exam: { totalMarks: number } }[]; percentage: number; grade: string; isPassing: boolean }) => {
        const counted = c.exams.filter((e) => !e.isAbsent);
        return {
          code: c.course.code, course: c.course.name, creditHours: c.course.creditHours, assessments: c.exams.length,
          obtained: counted.reduce((s, e) => s + e.marksObtained, 0), possible: counted.reduce((s, e) => s + e.exam.totalMarks, 0),
          percentage: c.percentage, grade: c.grade, result: c.isPassing ? "Pass" : "Fail",
        };
      });
      return {
        filename: `marksheet-${slug(p.registrationNo)}`,
        title: "Mark sheet",
        subtitle: `${person(p)} · ${p.registrationNo} · ${p.program.name} · published results only`,
        columns: [
          { key: "code", header: "Code", width: 10 }, { key: "course", header: "Course", width: 30 }, { key: "creditHours", header: "Cr. hrs", format: "number", width: 8 },
          { key: "assessments", header: "Assessments", format: "number", width: 12 }, { key: "obtained", header: "Obtained", format: "number", width: 10 },
          { key: "possible", header: "Out of", format: "number", width: 9 }, { key: "percentage", header: "%", format: "percent", width: 8 },
          { key: "grade", header: "Grade", width: 8 }, { key: "result", header: "Result", width: 8 },
        ],
        rows,
        summary: [{ label: "Overall", value: `${report.overallPercentage}% (${report.overallGrade})` }],
      };
    },
  },

  // ── Staff: records of their area ────────────────────────────
  students: {
    label: "Students",
    permission: "student.read",
    build: async (_actor, q) => {
      const { students } = await getStudents({
        page: 1, limit: MAX_ROWS, programId: q.programId, semesterId: q.semesterId, search: q.search,
        status: q.status as "ACTIVE" | undefined,
      });
      type S = { username: string; email: string; collegeEmail: string | null; studentProfile: { registrationNo: string; firstName: string; lastName: string; fatherName: string | null; cnic: string | null; phone: string | null; status: string; currentSemester: number | null; enrollmentDate: Date; program: { name: string } } | null };
      const rows = (students as S[]).filter((s) => s.studentProfile).map((s) => {
        const p = s.studentProfile!;
        return { regNo: p.registrationNo, name: person(p), father: p.fatherName, program: p.program.name, semester: p.currentSemester, status: p.status, cnic: p.cnic, phone: p.phone, email: s.email, collegeEmail: s.collegeEmail, enrolled: p.enrollmentDate };
      });
      return {
        filename: `students-${today()}`, title: "Student records",
        subtitle: [q.status && `Status: ${q.status}`, `${rows.length} students`].filter(Boolean).join(" · "),
        columns: [
          { key: "regNo", header: "Reg. no", width: 14 }, { key: "name", header: "Name", width: 22 }, { key: "father", header: "Father name", width: 20 },
          { key: "program", header: "Program", width: 24 }, { key: "semester", header: "Sem", format: "number", width: 6 }, { key: "status", header: "Status", width: 12 },
          { key: "cnic", header: "CNIC", width: 18 }, { key: "phone", header: "Phone", width: 14 }, { key: "email", header: "Email", width: 28 },
          { key: "collegeEmail", header: "College email", width: 28 }, { key: "enrolled", header: "Enrolled", format: "date", width: 13 },
        ],
        rows,
      };
    },
  },

  invoices: {
    label: "Fee invoices",
    permission: "fee.read",
    build: async (_actor, q) => {
      const invoices = await prisma.feeInvoice.findMany({
        where: { ...(q.status && { status: q.status as "UNPAID" }), ...(q.programId && { studentProfile: { programId: q.programId } }), ...(dateWhere(q) && { issuedAt: dateWhere(q) }) },
        orderBy: { issuedAt: "desc" }, take: MAX_ROWS,
        include: { studentProfile: { select: { registrationNo: true, firstName: true, lastName: true, program: { select: { code: true } } } } },
      });
      type I = { invoiceNo: string; semester: string | null; issuedAt: Date; dueDate: Date; totalAmount: number; discountAmount: number; paidAmount: number; dueAmount: number; status: string; studentProfile: { registrationNo: string; firstName: string; lastName: string; program: { code: string } } };
      const rows = (invoices as I[]).map((i) => ({ ...i, regNo: i.studentProfile.registrationNo, name: person(i.studentProfile), program: i.studentProfile.program.code }));
      const sum = (k: "totalAmount" | "paidAmount" | "dueAmount") => rows.reduce((s, r) => s + r[k], 0);
      return {
        filename: `fee-invoices-${today()}`, title: "Fee invoices", subtitle: [q.status && `Status: ${q.status}`, range(q)].filter(Boolean).join(" · ") || undefined,
        columns: [
          { key: "invoiceNo", header: "Invoice", width: 17 }, { key: "regNo", header: "Reg. no", width: 14 }, { key: "name", header: "Student", width: 22 }, { key: "program", header: "Prog", width: 8 },
          { key: "semester", header: "Term", width: 14 }, { key: "issuedAt", header: "Issued", format: "date", width: 13 }, { key: "dueDate", header: "Due date", format: "date", width: 13 },
          { key: "totalAmount", header: "Total", format: "currency", width: 12 }, { key: "discountAmount", header: "Discount", format: "currency", width: 11 },
          { key: "paidAmount", header: "Paid", format: "currency", width: 12 }, { key: "dueAmount", header: "Balance", format: "currency", width: 12 }, { key: "status", header: "Status", width: 10 },
        ],
        rows,
        summary: [{ label: "Invoices", value: String(rows.length) }, { label: "Billed", value: `PKR ${sum("totalAmount").toLocaleString("en-PK")}` }, { label: "Collected", value: `PKR ${sum("paidAmount").toLocaleString("en-PK")}` }, { label: "Outstanding", value: `PKR ${sum("dueAmount").toLocaleString("en-PK")}` }],
      };
    },
  },

  payments: {
    label: "Payments",
    permission: "payment.read",
    build: async (_actor, q) => {
      const payments = await prisma.feePayment.findMany({
        where: { ...(q.status && { verificationStatus: q.status as "PENDING" }), ...(dateWhere(q) && { paidAt: dateWhere(q) }) },
        orderBy: { paidAt: "desc" }, take: MAX_ROWS,
        include: { invoice: { select: { invoiceNo: true, studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } } } } },
      });
      type P = { paidAt: Date; amount: number; method: string; transactionId: string | null; verificationStatus: string; invoice: { invoiceNo: string; studentProfile: { registrationNo: string; firstName: string; lastName: string } } };
      const rows = (payments as P[]).map((p) => ({ ...p, invoiceNo: p.invoice.invoiceNo, regNo: p.invoice.studentProfile.registrationNo, name: person(p.invoice.studentProfile) }));
      const verified = rows.filter((r) => r.verificationStatus === "VERIFIED").reduce((s, r) => s + r.amount, 0);
      return {
        filename: `payments-${today()}`, title: "Payments", subtitle: [q.status && `Status: ${q.status}`, range(q)].filter(Boolean).join(" · ") || undefined,
        columns: [
          { key: "paidAt", header: "Received", format: "datetime", width: 18 }, { key: "invoiceNo", header: "Invoice", width: 17 }, { key: "regNo", header: "Reg. no", width: 14 }, { key: "name", header: "Student", width: 22 },
          { key: "amount", header: "Amount", format: "currency", width: 12 }, { key: "method", header: "Method", width: 14 }, { key: "transactionId", header: "Transaction ID", width: 18 }, { key: "verificationStatus", header: "Verification", width: 12 },
        ],
        rows,
        summary: [{ label: "Payments", value: String(rows.length) }, { label: "Verified total", value: `PKR ${verified.toLocaleString("en-PK")}` }],
      };
    },
  },

  defaulters: {
    label: "Fee defaulters",
    permission: "finance.report",
    build: async (_actor, q) => {
      const { invoices, totalOutstanding } = await getDefaulters({ page: 1, limit: MAX_ROWS, programId: q.programId });
      type D = { invoiceNo: string; dueAmount: number; dueDate: Date; status: string; semester: string | null; studentProfile: { registrationNo: string; firstName: string; lastName: string; phone: string | null; program: { code: string } } };
      const rows = (invoices as D[]).map((d) => ({ ...d, regNo: d.studentProfile.registrationNo, name: person(d.studentProfile), phone: d.studentProfile.phone, program: d.studentProfile.program.code }));
      return {
        filename: `defaulters-${today()}`, title: "Fee defaulters", subtitle: "Unpaid invoices past their due date",
        columns: [
          { key: "regNo", header: "Reg. no", width: 14 }, { key: "name", header: "Student", width: 22 }, { key: "program", header: "Prog", width: 8 }, { key: "phone", header: "Phone", width: 14 },
          { key: "invoiceNo", header: "Invoice", width: 17 }, { key: "semester", header: "Term", width: 14 }, { key: "dueDate", header: "Due date", format: "date", width: 13 }, { key: "dueAmount", header: "Balance", format: "currency", width: 12 }, { key: "status", header: "Status", width: 10 },
        ],
        rows,
        summary: [{ label: "Defaulters", value: String(rows.length) }, { label: "Total outstanding", value: `PKR ${Math.round(totalOutstanding).toLocaleString("en-PK")}` }],
      };
    },
  },

  fund: {
    label: "College fund ledger",
    permission: "fund.read",
    build: async (_actor, q) => {
      const { entries } = await listEntries({ page: 1, limit: MAX_ROWS, type: q.type as "INCOME" | undefined, from: q.from, to: q.to });
      type E = { entryDate: Date; type: string; category: string; source: string | null; description: string; reference: string | null; amount: number; recordedBy: { username: string; staffProfile: { firstName: string; lastName: string } | null } };
      const rows = (entries as E[]).map((e) => ({ ...e, by: e.recordedBy.staffProfile ? person(e.recordedBy.staffProfile) : e.recordedBy.username }));
      const total = (t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + r.amount, 0);
      return {
        filename: `college-fund-${today()}`, title: "College fund ledger", subtitle: range(q),
        columns: [
          { key: "entryDate", header: "Date", format: "date", width: 13 }, { key: "type", header: "Type", width: 9 }, { key: "category", header: "Category", width: 20 }, { key: "source", header: "Source / payee", width: 24 },
          { key: "description", header: "Description", width: 34 }, { key: "reference", header: "Reference", width: 14 }, { key: "amount", header: "Amount", format: "currency", width: 14 }, { key: "by", header: "Recorded by", width: 18 },
        ],
        rows,
        summary: [{ label: "Income entries", value: `PKR ${total("INCOME").toLocaleString("en-PK")}` }, { label: "Expenses", value: `PKR ${total("EXPENSE").toLocaleString("en-PK")}` }],
      };
    },
  },

  assistants: {
    label: "Assistants",
    permission: "assistant.manage",
    build: async (actor) => {
      const { assistants } = await listAssistants(actor, { page: 1, limit: 1000 });
      type A = { username: string; email: string; isActive: boolean; lastLoginAt: Date | null; duties: string[]; staffProfile: { employeeId: string; firstName: string; lastName: string; phone: string | null } | null };
      const rows = (assistants as A[]).map((a) => ({ employeeId: a.staffProfile?.employeeId, name: a.staffProfile ? person(a.staffProfile) : a.username, username: a.username, phone: a.staffProfile?.phone, duties: a.duties.join(", "), active: a.isActive ? "Active" : "Inactive", lastLogin: a.lastLoginAt }));
      return {
        filename: `assistants-${today()}`, title: "Assistant clerks",
        columns: [{ key: "employeeId", header: "Employee ID", width: 14 }, { key: "name", header: "Name", width: 22 }, { key: "username", header: "Username", width: 16 }, { key: "phone", header: "Phone", width: 14 }, { key: "duties", header: "Duties", width: 40 }, { key: "active", header: "Status", width: 10 }, { key: "lastLogin", header: "Last login", format: "datetime", width: 18 }],
        rows,
      };
    },
  },

  "section-attendance": {
    label: "Section attendance",
    permission: "attendance.read",
    build: async (actor, q) => {
      if (!q.sectionId) throw AppError.badRequest("sectionId is required");
      const sec = await prisma.section.findUnique({ where: { id: q.sectionId }, include: { course: { select: { code: true, name: true } } } });
      if (!sec) throw AppError.notFound("Section not found");
      const summary = await getSectionAttendanceSummary(q.sectionId, actor); // enforces the teacher/HOD ownership rules
      type R = { student: { registrationNo: string; firstName: string; lastName: string }; present: number; absent: number; late: number; totalSessions: number; percentage: number; isAtRisk: boolean };
      const rows = (summary.students as R[]).map((s) => ({ regNo: s.student.registrationNo, name: person(s.student), present: s.present, late: s.late, absent: s.absent, total: s.totalSessions, percentage: s.percentage, risk: s.isAtRisk ? "At risk" : "" }));
      return {
        filename: `attendance-${slug(sec.course.code)}-${slug(sec.name)}-${today()}`, title: "Section attendance",
        subtitle: `${sec.course.code} ${sec.course.name} · Section ${sec.name}`,
        columns: [{ key: "regNo", header: "Reg. no", width: 14 }, { key: "name", header: "Student", width: 24 }, { key: "present", header: "Present", format: "number", width: 9 }, { key: "late", header: "Late", format: "number", width: 7 }, { key: "absent", header: "Absent", format: "number", width: 8 }, { key: "total", header: "Classes", format: "number", width: 9 }, { key: "percentage", header: "%", format: "percent", width: 8 }, { key: "risk", header: "", width: 10 }],
        rows,
        summary: [{ label: "Classes held", value: String(summary.totalSessions) }, { label: "At risk (<75%)", value: String(rows.filter((r) => r.risk).length) }],
      };
    },
  },

  "section-results": {
    label: "Exam results",
    permission: "grade.read",
    build: async (actor, q) => {
      if (!q.examId) throw AppError.badRequest("examId is required");
      const exam = await prisma.exam.findUnique({
        where: { id: q.examId },
        include: { section: { include: { course: { select: { code: true, name: true } } } }, results: { include: { studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } } } } },
      });
      if (!exam) throw AppError.notFound("Exam not found");
      await assertCanManageSection(actor, exam.sectionId);
      type R = { marksObtained: number; isAbsent: boolean; isPublished: boolean; remarks: string | null; studentProfile: { registrationNo: string; firstName: string; lastName: string } };
      const rows = (exam.results as R[])
        .map((r) => ({ regNo: r.studentProfile.registrationNo, name: person(r.studentProfile), marks: r.isAbsent ? null : r.marksObtained, outcome: r.isAbsent ? "Absent" : r.marksObtained >= exam.passingMarks ? "Pass" : "Fail", published: r.isPublished ? "Yes" : "No", remarks: r.remarks }))
        .sort((a, b) => a.regNo.localeCompare(b.regNo));
      return {
        filename: `results-${slug(exam.section.course.code)}-${slug(exam.title)}`, title: "Exam results",
        subtitle: `${exam.section.course.code} ${exam.section.course.name} · ${exam.title} · out of ${exam.totalMarks}, passing ${exam.passingMarks}`,
        columns: [{ key: "regNo", header: "Reg. no", width: 14 }, { key: "name", header: "Student", width: 24 }, { key: "marks", header: "Marks", format: "number", width: 9 }, { key: "outcome", header: "Result", width: 9 }, { key: "published", header: "Published", width: 10 }, { key: "remarks", header: "Remarks", width: 28 }],
        rows,
      };
    },
  },
};
