"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useRole } from "@/hooks/use-role";
import { useSections } from "@/features/academic/hooks";
import type { Section } from "@/features/academic/types";
import * as api from "./api";

export const useStaffList = (params: api.StaffListParams, enabled = true) =>
  useQuery({ queryKey: queryKeys.staff.list(params), queryFn: () => api.fetchStaffList(params), placeholderData: keepPreviousData, enabled });
export const useStaffMember = (id: string) => useQuery({ queryKey: queryKeys.staff.detail(id), queryFn: () => api.fetchStaffMember(id), enabled: !!id });
export const useWorkload = (id: string | "me") => useQuery({ queryKey: queryKeys.staff.workload(id), queryFn: () => api.fetchWorkload(id) });

export const useUpdateStaffStatus = () =>
  useAppMutation({ mutationFn: api.updateStaffStatus, successMessage: "Staff status updated", invalidate: [queryKeys.staff.all, queryKeys.users.all] });
export const useRequestLeave = () => useAppMutation({ mutationFn: api.requestLeave, successMessage: "Leave request submitted" });

/**
 * Sections the signed-in person can work with: a teacher/HOD's own sections (from their workload),
 * everyone else (admin) gets every section. Shaped like `Section` so it plugs into <SectionSelect sections=…>.
 */
export function useWorkableSections(): { sections: Section[]; isLoading: boolean; isError: boolean } {
  const { role } = useRole();
  const teaching = role === "TEACHER" || role === "HOD";
  const workload = useQuery({ queryKey: queryKeys.staff.workload("me"), queryFn: () => api.fetchWorkload("me"), enabled: teaching });
  const all = useSections({}, !teaching);
  if (teaching) {
    const sections: Section[] = (workload.data?.sections ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      capacity: w.capacity,
      courseId: "",
      semesterId: "",
      course: w.course,
      semester: { ...w.semester, isActive: true },
      teachers: [],
      _count: { enrollments: w._count.enrollments },
    }));
    return { sections, isLoading: workload.isLoading, isError: workload.isError };
  }
  return { sections: all.data ?? [], isLoading: all.isLoading, isError: all.isError };
}
