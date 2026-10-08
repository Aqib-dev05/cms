"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { createStudent, fetchStudent, fetchStudents, updateStudentStatus, type StudentListParams } from "./api";
import type { SettableStatus } from "./types";

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: queryKeys.students.list(params),
    queryFn: () => fetchStudents(params),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });
}

export function useStudent(id: string) {
  return useQuery({ queryKey: queryKeys.students.detail(id), queryFn: () => fetchStudent(id) });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.overview });
    },
  });
}

export function useUpdateStudentStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: SettableStatus) => updateStudentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.overview });
    },
  });
}
