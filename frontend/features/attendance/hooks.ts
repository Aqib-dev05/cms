"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useMyAttendance = () => useQuery({ queryKey: queryKeys.attendance.me({}), queryFn: api.fetchMyAttendance });
export const useSectionSessions = (sectionId: string) => useQuery({ queryKey: queryKeys.attendance.sessions(sectionId), queryFn: () => api.fetchSectionSessions(sectionId), enabled: !!sectionId });
export const useSectionSummary = (sectionId: string) => useQuery({ queryKey: queryKeys.attendance.summary(sectionId), queryFn: () => api.fetchSectionSummary(sectionId), enabled: !!sectionId });
export const useAttendanceSession = (id: string | null) => useQuery({ queryKey: queryKeys.attendance.session(id ?? ""), queryFn: () => api.fetchSession(id as string), enabled: !!id });

export const useMarkAttendance = () => useAppMutation({ mutationFn: api.markAttendance, successMessage: "Attendance saved", invalidate: [queryKeys.attendance.all], toastError: false });
export const useUpdateRecord = () => useAppMutation({ mutationFn: api.updateRecord, successMessage: "Record updated", invalidate: [queryKeys.attendance.all] });
