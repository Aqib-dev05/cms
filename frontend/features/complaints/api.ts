import { getData, getDataOr, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { Complaint, ComplaintCategory, ComplaintDetail, ComplaintStats, ComplaintStatus } from "./types";

export interface ComplaintParams extends PageParams {
  status?: ComplaintStatus;
  categoryId?: string;
}
export const fetchComplaints = (params: ComplaintParams): Promise<PaginatedResponse<Complaint>> => fetchPaginated<Complaint, ComplaintParams>("/complaints", params);
export const fetchComplaint = (id: string) => getData<ComplaintDetail>(`/complaints/${id}`);
export const fetchCategories = () => getDataOr<ComplaintCategory[]>("/complaints/categories", []);
export const fetchStats = () => getData<ComplaintStats>("/complaints/stats");

export const createComplaint = (b: { title: string; description: string; categoryId: string }) => sendData<Complaint>("post", "/complaints", b);
export const addComment = ({ id, content, isInternal }: { id: string; content: string; isInternal: boolean }) => sendData("post", `/complaints/${id}/comments`, { content, isInternal });
export const assignComplaint = ({ id, assignedToId, note }: { id: string; assignedToId: string; note?: string }) => sendData("patch", `/complaints/${id}/assign`, { assignedToId, ...(note ? { note } : {}) });
export const updateStatus = ({ id, status, note }: { id: string; status: string; note?: string }) => sendData("patch", `/complaints/${id}/status`, { status, ...(note ? { note } : {}) });
