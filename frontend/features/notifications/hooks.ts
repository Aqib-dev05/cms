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

import { keepPreviousData } from "@tanstack/react-query";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "./api";

export const useNotifications = (params: { page: number; limit: number; unread?: boolean }) =>
  useQuery({ queryKey: queryKeys.notifications.list(params), queryFn: () => fetchNotifications(params), placeholderData: keepPreviousData });
export const useMarkRead = () => useAppMutation({ mutationFn: markNotificationRead, invalidate: [queryKeys.notifications.all] });
export const useMarkAllRead = () => useAppMutation({ mutationFn: markAllNotificationsRead, successMessage: "All notifications marked as read", invalidate: [queryKeys.notifications.all] });
