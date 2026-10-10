import { getData, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { Application, ApplicationDetail, ApplicationStatus, EnrollResult } from "./types";

export interface ApplicationParams extends PageParams {
  status?: ApplicationStatus;
  programId?: string;
}
export const fetchApplications = (params: ApplicationParams): Promise<PaginatedResponse<Application>> => fetchPaginated<Application, ApplicationParams>("/admissions", params);
export const fetchApplication = (id: string) => getData<ApplicationDetail>(`/admissions/${id}`);
export const reviewApplication = ({ id, status, remarks }: { id: string; status: string; remarks?: string }) => sendData("patch", `/admissions/${id}/review`, { status, ...(remarks ? { remarks } : {}) });
export const enrollApplicant = (id: string) => sendData<EnrollResult>("post", `/admissions/${id}/enroll`);
