"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated } from "@/store/slices/auth.slice";
import { fetchUnreadCount } from "./api";

export function useUnreadCount() {
  const authed = useAppSelector(selectIsAuthenticated);
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: fetchUnreadCount,
    enabled: authed,
    retry: false, // e.g. a role without notification.read shouldn't spam retries
    refetchOnWindowFocus: true,
  });
}
