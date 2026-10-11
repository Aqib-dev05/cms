"use client";

import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";

/**
 * True when the signed-in user holds the permission. ADMIN always can; if the permission list
 * hasn't been loaded yet (older persisted session) we show the control and let the API decide.
 */
export function useCan(permission: string): boolean {
  const user = useAppSelector(selectUser);
  if (!user) return false;
  if (user.role.name === "ADMIN" || !user.permissions) return true;
  return user.permissions.includes(permission);
}
