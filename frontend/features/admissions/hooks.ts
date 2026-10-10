"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useApplications = (params: api.ApplicationParams) => useQuery({ queryKey: queryKeys.admissions.list(params), queryFn: () => api.fetchApplications(params), placeholderData: keepPreviousData });
export const useApplication = (id: string | null) => useQuery({ queryKey: queryKeys.admissions.detail(id ?? ""), queryFn: () => api.fetchApplication(id as string), enabled: !!id });

const A = [queryKeys.admissions.all];
export const useReviewApplication = () => useAppMutation({ mutationFn: api.reviewApplication, successMessage: "Application reviewed", invalidate: A });
export const useEnrollApplicant = () => useAppMutation({ mutationFn: api.enrollApplicant, invalidate: [queryKeys.admissions.all, queryKeys.students.all, queryKeys.analytics.overview] });
