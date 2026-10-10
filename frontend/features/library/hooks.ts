"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/format";
import { useAppMutation } from "@/hooks/use-app-mutation";
import type { PageParams } from "@/lib/pagination";
import * as api from "./api";

export const useBooks = (params: PageParams, enabled = true) => useQuery({ queryKey: queryKeys.library.books(params), queryFn: () => api.fetchBooks(params), placeholderData: keepPreviousData, enabled });
export const useBook = (id: string | null) => useQuery({ queryKey: queryKeys.library.book(id ?? ""), queryFn: () => api.fetchBook(id as string), enabled: !!id });
export const useActiveIssues = (params: PageParams) => useQuery({ queryKey: queryKeys.library.active(params), queryFn: () => api.fetchActiveIssues(params), placeholderData: keepPreviousData });
export const useOverdueIssues = () => useQuery({ queryKey: queryKeys.library.overdue, queryFn: api.fetchOverdue });
export const useHistory = (profileId: string | undefined) => useQuery({ queryKey: queryKeys.library.history(profileId ?? ""), queryFn: () => api.fetchHistory(profileId as string), enabled: !!profileId });

const LIB = [queryKeys.library.all];
export const useCreateBook = () => useAppMutation({ mutationFn: api.createBook, successMessage: "Book added", invalidate: LIB });
export const useUpdateBook = () => useAppMutation({ mutationFn: api.updateBook, successMessage: "Book updated", invalidate: LIB });
export const useAddCopies = () => useAppMutation({ mutationFn: api.addCopies, successMessage: "Copies added", invalidate: LIB });
export const useIssueBook = () => useAppMutation({ mutationFn: api.issueBook, successMessage: "Book issued", invalidate: LIB });
export const useReturnBook = () =>
  useAppMutation({
    mutationFn: api.returnBook,
    successMessage: (r) => (r.fine > 0 ? `Returned ${r.daysLate} day(s) late — fine ${formatCurrency(r.fine)}` : "Book returned"),
    invalidate: LIB,
  });
