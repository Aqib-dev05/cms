/** Central query-key factory — keeps invalidation predictable. */
export const queryKeys = {
  auth: { me: ["auth", "me"] as const },
  analytics: {
    overview: ["analytics", "overview"] as const,
    feeTrend: (months: number) => ["analytics", "fees", "trend", months] as const,
    attendanceTrend: (months: number) => ["analytics", "attendance", "trend", months] as const,
    enrollment: ["analytics", "enrollment", "by-program"] as const,
  },
  academic: { programs: ["academic", "programs"] as const },
  students: {
    all: ["students"] as const,
    list: (params: object) => ["students", "list", params] as const,
    detail: (id: string) => ["students", "detail", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },
};
