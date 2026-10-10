"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useExams = (params: { sectionId?: string; semesterId?: string }, enabled = true) => useQuery({ queryKey: queryKeys.exams.list(params), queryFn: () => api.fetchExams(params), enabled });
export const useExam = (id: string) => useQuery({ queryKey: queryKeys.exams.detail(id), queryFn: () => api.fetchExam(id), enabled: !!id });
export const useExamSummary = (id: string, enabled = true) => useQuery({ queryKey: queryKeys.exams.summary(id), queryFn: () => api.fetchExamSummary(id), enabled: enabled && !!id });
export const useMyGrades = () => useQuery({ queryKey: queryKeys.exams.myGrades("all"), queryFn: () => api.fetchMyGrades() });

const EXAMS = [queryKeys.exams.all];
export const useCreateExam = () => useAppMutation({ mutationFn: api.createExam, successMessage: "Exam created", invalidate: EXAMS });
export const useUpdateExam = () => useAppMutation({ mutationFn: api.updateExam, successMessage: "Exam updated", invalidate: EXAMS });
export const useDeleteExam = () => useAppMutation({ mutationFn: api.deleteExam, successMessage: "Exam deleted", invalidate: EXAMS });
export const usePublishResults = () => useAppMutation({ mutationFn: api.publishResults, successMessage: "Results published — students can see them now", invalidate: EXAMS });
export const useSaveResults = () => useAppMutation({ mutationFn: api.saveResults, successMessage: "Results saved", invalidate: EXAMS, toastError: false });
