import { api } from "@/lib/api";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { ApiResponse, PaginatedResponse } from "@/types";
import type { StudentFormValues } from "./schema";
import type { CreatedStudent, SettableStatus, StudentDetail, StudentListItem, StudentStatus } from "./types";

export interface StudentListParams extends PageParams {
  status?: StudentStatus;
  programId?: string;
}

export function fetchStudents(params: StudentListParams): Promise<PaginatedResponse<StudentListItem>> {
  return fetchPaginated<StudentListItem>("/students", params);
}

export async function fetchStudent(id: string): Promise<StudentDetail> {
  const { data } = await api.get<ApiResponse<StudentDetail>>(`/students/${id}`);
  if (!data.data) throw new Error(data.message || "Student not found");
  return data.data;
}

export async function createStudent(payload: StudentFormValues): Promise<CreatedStudent> {
  const { data } = await api.post<ApiResponse<CreatedStudent>>("/students", payload);
  if (!data.data) throw new Error(data.message || "Could not create the student");
  return data.data;
}

export async function updateStudentStatus(id: string, status: SettableStatus): Promise<void> {
  await api.patch(`/students/${id}/status`, { status });
}

/** The signed-in student's own profile + active enrollments (no permission needed). */
export async function fetchMyProfile(): Promise<StudentDetail> {
  const { data } = await api.get<ApiResponse<StudentDetail>>("/students/me");
  if (!data.data) throw new Error(data.message || "Profile not found");
  return data.data;
}
