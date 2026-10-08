import type { RoleName } from "@/types";

/** URL segment each role lives under: /admin, /hod, /clerk ... */
export const ROLE_BASE_PATH: Record<RoleName, string> = {
  ADMIN: "admin",
  HOD: "hod",
  TEACHER: "teacher",
  HEAD_CLERK: "clerk",
  CLERK: "clerk",
  COMPLAINT_OFFICER: "complaint-officer",
  LIBRARIAN: "librarian",
  STUDENT: "student",
};

export function getRoleHome(role: RoleName): string {
  return `/${ROLE_BASE_PATH[role]}`;
}
