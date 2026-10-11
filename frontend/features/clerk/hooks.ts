"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useDuties = () => useQuery({ queryKey: queryKeys.clerk.duties, queryFn: api.fetchDuties, staleTime: 10 * 60_000 });
export const useAssistants = (params: api.AssistantParams) => useQuery({ queryKey: queryKeys.clerk.assistants(params), queryFn: () => api.fetchAssistants(params), placeholderData: keepPreviousData });

const INV = [queryKeys.clerk.all];
export const useCreateAssistant = () => useAppMutation({ mutationFn: api.createAssistant, successMessage: (a) => `Assistant ${a.username} created`, invalidate: INV, toastError: false });
export const useSetDuties = () => useAppMutation({ mutationFn: api.setDuties, successMessage: "Duties updated", invalidate: INV, toastError: false });
export const useSetAssistantStatus = () => useAppMutation({ mutationFn: api.setStatus, successMessage: (a) => (a.isActive ? "Assistant activated" : "Assistant deactivated"), invalidate: INV });
export const useResetAssistantPassword = () => useAppMutation({ mutationFn: api.resetPassword, successMessage: "Password reset", toastError: false });
