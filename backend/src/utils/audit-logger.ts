import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { logger } from "./logger";

export interface AuditPayload {
  userId?:   string;
  action:    string;
  module:    string;
  entityId?: string;
  oldData?:  Record<string, unknown>;
  newData?:  Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry.
 * Non-blocking — failures are logged but never thrown.
 */
export async function audit(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ...payload,
        oldData: payload.oldData as Prisma.InputJsonObject | undefined,
        newData: payload.newData as Prisma.InputJsonObject | undefined,
      },
    });
  } catch (err) {
    // Audit failure must never break the main request
    logger.error("Audit log write failed:", err);
  }
}

// ─── Pre-built action constants ───────────────────────────────

export const AUDIT_ACTIONS = {
  // Auth
  LOGIN:              "LOGIN",
  LOGOUT:             "LOGOUT",
  PASSWORD_CHANGE:    "PASSWORD_CHANGE",
  PASSWORD_RESET:     "PASSWORD_RESET",

  // Users
  USER_CREATE:        "USER_CREATE",
  USER_UPDATE:        "USER_UPDATE",
  USER_DEACTIVATE:    "USER_DEACTIVATE",
  USER_ACTIVATE:      "USER_ACTIVATE",

  // Students
  STUDENT_CREATE:     "STUDENT_CREATE",
  STUDENT_ENROLL:     "STUDENT_ENROLL",
  STUDENT_UNENROLL:   "STUDENT_UNENROLL",
  STUDENT_STATUS:     "STUDENT_STATUS_CHANGE",

  // Admissions
  APPLICATION_SUBMIT: "APPLICATION_SUBMIT",
  APPLICATION_REVIEW: "APPLICATION_REVIEW",
  APPLICATION_ENROLL: "APPLICATION_ENROLL",

  // Finance
  INVOICE_CREATE:     "INVOICE_CREATE",
  PAYMENT_RECORD:     "PAYMENT_RECORD",
  DISCOUNT_APPLY:     "DISCOUNT_APPLY",

  // Complaints
  COMPLAINT_CREATE:   "COMPLAINT_CREATE",
  COMPLAINT_ASSIGN:   "COMPLAINT_ASSIGN",
  COMPLAINT_STATUS:   "COMPLAINT_STATUS_CHANGE",

  // Academic
  DEPT_CREATE:        "DEPARTMENT_CREATE",
  PROGRAM_CREATE:     "PROGRAM_CREATE",
  COURSE_CREATE:      "COURSE_CREATE",
  SECTION_CREATE:     "SECTION_CREATE",

  // Attendance
  ATTENDANCE_MARK:    "ATTENDANCE_MARK",
  ATTENDANCE_UPDATE:  "ATTENDANCE_UPDATE",

  // Exams
  EXAM_CREATE:        "EXAM_CREATE",
  RESULT_PUBLISH:     "RESULT_PUBLISH",

  // Library
  BOOK_ISSUE:         "BOOK_ISSUE",
  BOOK_RETURN:        "BOOK_RETURN",

  // Staff
  LEAVE_REQUEST:      "LEAVE_REQUEST",
  STAFF_STATUS:       "STAFF_STATUS_CHANGE",
} as const;
