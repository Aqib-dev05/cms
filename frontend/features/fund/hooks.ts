"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useFundCategories = () => useQuery({ queryKey: queryKeys.fund.categories, queryFn: api.fetchFundCategories, staleTime: 10 * 60_000 });
export const useFundSummary = (params: { from?: string; to?: string }) => useQuery({ queryKey: queryKeys.fund.summary(params), queryFn: () => api.fetchFundSummary(params), placeholderData: keepPreviousData });
export const useFundEntries = (params: api.FundEntryParams) => useQuery({ queryKey: queryKeys.fund.entries(params), queryFn: () => api.fetchFundEntries(params), placeholderData: keepPreviousData });
export const useCreateFundEntry = () => useAppMutation({ mutationFn: api.createFundEntry, successMessage: "Entry recorded", invalidate: [queryKeys.fund.all], toastError: false });
export const useVoidFundEntry = () => useAppMutation({ mutationFn: api.voidFundEntry, successMessage: "Entry voided", invalidate: [queryKeys.fund.all], toastError: false });
