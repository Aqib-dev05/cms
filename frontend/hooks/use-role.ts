"use client";

import { ROLE_BASE_PATH } from "@/config/roles";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import type { RoleName } from "@/types";

/** The signed-in user's role and the URL base of their area (e.g. "/teacher"). */
export function useRole(): { role: RoleName | null; basePath: string; userId: string | null } {
  const user = useAppSelector(selectUser);
  const role = user?.role.name ?? null;
  return { role, basePath: role ? `/${ROLE_BASE_PATH[role]}` : "", userId: user?.id ?? null };
}

export const STAFF_ROLES: RoleName[] = ["ADMIN", "HOD", "TEACHER", "HEAD_CLERK", "CLERK", "COMPLAINT_OFFICER", "LIBRARIAN"];
export const isTeaching = (role: RoleName | null) => role === "TEACHER" || role === "HOD";
export const isFinance = (role: RoleName | null) => role === "CLERK" || role === "HEAD_CLERK";
