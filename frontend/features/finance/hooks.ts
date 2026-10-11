"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import type { PageParams } from "@/lib/pagination";
import * as api from "./api";

export const useFinanceSummary = (enabled = true) => useQuery({ queryKey: queryKeys.finance.summary, queryFn: api.fetchSummary, enabled });
export const useMyFinance = () => useQuery({ queryKey: queryKeys.finance.me, queryFn: api.fetchMyFinance });
export const useInvoices = (params: api.InvoiceParams, enabled = true) => useQuery({ queryKey: queryKeys.finance.invoices(params), queryFn: () => api.fetchInvoices(params), placeholderData: keepPreviousData, enabled });
export const useInvoice = (id: string) => useQuery({ queryKey: queryKeys.finance.invoice(id), queryFn: () => api.fetchInvoice(id), enabled: !!id });
export const useFeeTypes = () => useQuery({ queryKey: queryKeys.finance.feeTypes, queryFn: api.fetchFeeTypes, staleTime: 5 * 60_000 });
export const useStructures = (programId?: string) => useQuery({ queryKey: queryKeys.finance.structures(programId ?? ""), queryFn: () => api.fetchStructures(programId) });

const FIN = [queryKeys.finance.all, queryKeys.analytics.overview];
export const useCreateInvoice = () => useAppMutation({ mutationFn: api.createInvoice, successMessage: (i) => `Invoice ${i.invoiceNo} created`, invalidate: FIN });
export const useRecordPayment = () => useAppMutation({ mutationFn: api.recordPayment, successMessage: "Payment received — waiting for verification", invalidate: FIN });
export const useApplyDiscount = () => useAppMutation({ mutationFn: api.applyDiscount, successMessage: "Discount applied", invalidate: FIN });
export const useCreateFeeType = () => useAppMutation({ mutationFn: api.createFeeType, successMessage: "Fee type created", invalidate: [queryKeys.finance.feeTypes] });
export const useUpdateFeeType = () => useAppMutation({ mutationFn: api.updateFeeType, successMessage: "Fee type updated", invalidate: [queryKeys.finance.feeTypes] });
export const useCreateStructure = () => useAppMutation({ mutationFn: api.createStructure, successMessage: "Fee structure created", invalidate: [queryKeys.finance.all] });

export const usePayments = (params: api.PaymentParams, enabled = true) => useQuery({ queryKey: queryKeys.finance.payments(params), queryFn: () => api.fetchPayments(params), placeholderData: keepPreviousData, enabled });
export const useDefaulters = (params: PageParams & { programId?: string }) => useQuery({ queryKey: queryKeys.finance.defaulters(params), queryFn: () => api.fetchDefaulters(params), placeholderData: keepPreviousData });
export const useDailyCollection = (date: string) => useQuery({ queryKey: queryKeys.finance.dailyCollection(date), queryFn: () => api.fetchDailyCollection(date) });
export const useVerifyPayment = () => useAppMutation({ mutationFn: api.verifyPayment, successMessage: "Payment verified", invalidate: FIN });
export const useRejectPayment = () => useAppMutation({ mutationFn: api.rejectPayment, successMessage: "Payment rejected", invalidate: FIN });
export const useBulkCreateInvoices = () => useAppMutation({ mutationFn: api.bulkCreateInvoices, invalidate: FIN });
