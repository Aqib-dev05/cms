import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<ApiResponse<{ unreadCount: number }>>("/notifications/unread-count");
  return data.data?.unreadCount ?? 0;
}
