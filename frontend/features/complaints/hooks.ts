"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useComplaints = (params: api.ComplaintParams) => useQuery({ queryKey: queryKeys.complaints.list(params), queryFn: () => api.fetchComplaints(params), placeholderData: keepPreviousData });
export const useComplaint = (id: string) => useQuery({ queryKey: queryKeys.complaints.detail(id), queryFn: () => api.fetchComplaint(id), enabled: !!id });
export const useComplaintCategories = () => useQuery({ queryKey: queryKeys.complaints.categories, queryFn: api.fetchCategories, staleTime: 10 * 60_000 });
export const useComplaintStats = (enabled = true) => useQuery({ queryKey: queryKeys.complaints.stats, queryFn: api.fetchStats, enabled });

const C = [queryKeys.complaints.all];
export const useCreateComplaint = () => useAppMutation({ mutationFn: api.createComplaint, successMessage: "Complaint submitted. You'll be notified of updates.", invalidate: C });
export const useAddComment = () => useAppMutation({ mutationFn: api.addComment, successMessage: "Comment added", invalidate: C });
export const useAssignComplaint = () => useAppMutation({ mutationFn: api.assignComplaint, successMessage: "Complaint assigned", invalidate: C });
export const useUpdateComplaintStatus = () => useAppMutation({ mutationFn: api.updateStatus, successMessage: "Status updated", invalidate: C });
