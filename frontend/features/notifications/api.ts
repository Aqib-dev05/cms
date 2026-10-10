import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<ApiResponse<{ unreadCount: number }>>("/notifications/unread-count");
  return data.data?.unreadCount ?? 0;
}

export interface NotificationItem {
  id: string;
  notificationId: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  notification: { id: string; title: string; body: string; channel: string; createdAt: string };
}

export const fetchNotifications = (params: { page: number; limit: number; unread?: boolean }) =>
  api.get<import("@/types").PaginatedResponse<NotificationItem>>("/notifications", { params: { page: params.page, limit: params.limit, ...(params.unread ? { unread: "true" } : {}) } }).then((r) => r.data);
export const markNotificationRead = (notificationId: string) => api.patch(`/notifications/${notificationId}/read`);
export const markAllNotificationsRead = () => api.patch("/notifications/read-all");
