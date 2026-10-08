"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "@/config/roles";
import { useAppSelector } from "@/store/hooks";
import { selectHydrated, selectIsAuthenticated, selectUser } from "@/store/slices/auth.slice";
import { FullScreenLoader } from "@/components/shared/full-screen-loader";

/** For public pages (login): send already-signed-in users to their dashboard. */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAppSelector(selectHydrated);
  const authed = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (hydrated && authed && user) router.replace(getRoleHome(user.role.name));
  }, [hydrated, authed, user, router]);

  if (!hydrated || authed) return <FullScreenLoader />;
  return <>{children}</>;
}
