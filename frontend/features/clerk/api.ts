import { getData, getDataOr, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { Assistant, DutyInfo } from "./types";

export interface AssistantParams extends PageParams {
  search?: string;
  isActive?: boolean;
}

export interface CreateAssistantBody {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  cnic?: string;
  designation?: string;
  duties: string[];
}

export const fetchDuties = () => getDataOr<DutyInfo[]>("/clerk/duties", []);
export const fetchAssistants = (params: AssistantParams): Promise<PaginatedResponse<Assistant>> => fetchPaginated<Assistant, AssistantParams>("/clerk/assistants", params);
export const fetchAssistant = (id: string) => getData<Assistant>(`/clerk/assistants/${id}`);
export const createAssistant = (b: CreateAssistantBody) => sendData<Assistant>("post", "/clerk/assistants", b);
export const setDuties = ({ id, duties }: { id: string; duties: string[] }) => sendData<Assistant>("put", `/clerk/assistants/${id}/duties`, { duties });
export const setStatus = ({ id, isActive }: { id: string; isActive: boolean }) => sendData<Assistant>("patch", `/clerk/assistants/${id}/status`, { isActive });
export const resetPassword = ({ id, newPassword }: { id: string; newPassword: string }) => sendData("patch", `/clerk/assistants/${id}/reset-password`, { newPassword });
