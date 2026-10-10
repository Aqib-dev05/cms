import { api } from "@/lib/api";
import { getData, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse, RoleName } from "@/types";
import type { StaffDetail, StaffListItem, StaffStatus, Workload } from "./types";

export interface StaffListParams extends PageParams {
  departmentId?: string;
  role?: RoleName;
  status?: StaffStatus;
}

export const fetchStaffList = (params: StaffListParams): Promise<PaginatedResponse<StaffListItem>> => fetchPaginated<StaffListItem, StaffListParams>("/staff", params);
export const fetchStaffMember = (id: string) => getData<StaffDetail>(`/staff/${id}`);
export const fetchWorkload = (id: string | "me") => getData<Workload>(id === "me" ? "/staff/me/workload" : `/staff/${id}/workload`);

export const updateStaffStatus = ({ id, status, leavingDate }: { id: string; status: StaffStatus; leavingDate?: string }) =>
  sendData("patch", `/staff/${id}/status`, { status, ...(leavingDate ? { leavingDate } : {}) });

export interface LeaveBody {
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
}
export async function requestLeave(body: LeaveBody) {
  const { data } = await api.post<{ data: { days: number; status: string } }>("/staff/me/leave", body);
  return data.data;
}
