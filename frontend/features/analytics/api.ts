import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { AnalyticsOverview, AttendanceTrendPoint, EnrollmentByProgram, FeeTrendPoint } from "./types";

async function get<T>(url: string, params?: Record<string, number>): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url, { params });
  if (data.data === undefined) throw new Error(data.message || "Empty response");
  return data.data;
}

export const fetchOverview = () => get<AnalyticsOverview>("/analytics/overview");
export const fetchFeeTrend = (months: number) => get<FeeTrendPoint[]>("/analytics/fees/trend", { months });
export const fetchAttendanceTrend = (months: number) => get<AttendanceTrendPoint[]>("/analytics/attendance/trend", { months });
export const fetchEnrollmentByProgram = () => get<EnrollmentByProgram[]>("/analytics/enrollment/by-program");
