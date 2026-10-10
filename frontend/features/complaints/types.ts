import type { RoleName } from "@/types";

export type ComplaintStatus = "SUBMITTED" | "UNDER_REVIEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
export const COMPLAINT_STATUSES: ComplaintStatus[] = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];
/** Statuses staff can move a complaint to (SUBMITTED is only the starting state). */
export const SETTABLE_COMPLAINT_STATUSES = ["UNDER_REVIEW", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"] as const;

export interface ComplaintCategory {
  id: string;
  name: string;
  description: string | null;
  routeToRole: RoleName;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  categoryId: string;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  category: { name: string; routeToRole: RoleName };
  createdBy: { username: string; studentProfile: { firstName: string; lastName: string; registrationNo: string } | null };
  _count?: { comments: number };
}

export interface ComplaintComment {
  id: string;
  complaintId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}
export interface StatusHistoryEntry {
  id: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  changedById: string;
  note: string | null;
  createdAt: string;
}
export interface ComplaintDetail extends Omit<Complaint, "category" | "_count"> {
  category: ComplaintCategory;
  comments: ComplaintComment[];
  statusHistory: StatusHistoryEntry[];
}

export interface ComplaintStats {
  byStatus: { status: ComplaintStatus; _count: { id: number } }[];
  byCategory: { categoryId: string; _count: { id: number } }[];
  overdueCount: number;
}

export const submitterName = (c: Pick<Complaint, "createdBy">) => (c.createdBy.studentProfile ? `${c.createdBy.studentProfile.firstName} ${c.createdBy.studentProfile.lastName}` : c.createdBy.username);
