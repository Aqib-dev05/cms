"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ROLE_BASE_PATH } from "@/config/roles";
import { fetchMe } from "@/features/auth/api";
import { queryKeys } from "@/lib/query-keys";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectHydrated, selectIsAuthenticated, selectUser, setUser } from "@/store/slices/auth.slice";
import { FullScreenLoader } from "@/components/shared/full-screen-loader";

/**
 * Client-side route protection (the dashboard is SPA-style: the access token
 * lives in the browser and the API may be on a different domain).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector(selectHydrated);
  const authed = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);

  const base = pathname.split("/")[1];
  const expectedBase = user ? ROLE_BASE_PATH[user.role.name] : null;
  const wrongArea = authed && !!expectedBase && base !== expectedBase;

  // Re-validate the persisted session (also triggers a token refresh if it expired).
  const me = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    enabled: hydrated && authed,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (me.data && JSON.stringify(me.data) !== JSON.stringify(user)) dispatch(setUser(me.data));
  }, [me.data, user, dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    if (!authed) router.replace("/login");
    else if (wrongArea && expectedBase) router.replace(`/${expectedBase}`);
  }, [hydrated, authed, wrongArea, expectedBase, router]);

  if (!hydrated || !authed || wrongArea) return <FullScreenLoader />;
  return <>{children}</>;
}
