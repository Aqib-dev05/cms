"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "@/config/roles";
import { useAppSelector } from "@/store/hooks";
import { selectHydrated, selectIsAuthenticated, selectUser } from "@/store/slices/auth.slice";
import { FullScreenLoader } from "@/components/shared/full-screen-loader";

export default function RootPage() {
  const router = useRouter();
  const hydrated = useAppSelector(selectHydrated);
  const authed = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(authed && user ? getRoleHome(user.role.name) : "/login");
  }, [hydrated, authed, user, router]);

  return <FullScreenLoader />;
}
