import { getDataOr } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  module: string;
  entityId: string | null;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    username: string;
    role: { name: string };
    staffProfile: { firstName: string; lastName: string } | null;
    studentProfile: { firstName: string; lastName: string; registrationNo: string } | null;
  } | null;
}

export interface AuditParams extends PageParams {
  module?: string;
  from?: string;
  to?: string;
}

export const fetchAuditLogs = (params: AuditParams): Promise<PaginatedResponse<AuditLog>> => fetchPaginated<AuditLog, AuditParams>("/audit", params);
export const fetchAuditModules = () => getDataOr<{ module: string; _count: { id: number } }[]>("/audit/modules", []);

export const actorName = (l: AuditLog) => {
  const p = l.user?.staffProfile ?? l.user?.studentProfile;
  return p ? `${p.firstName} ${p.lastName}` : (l.user?.username ?? "System");
};
