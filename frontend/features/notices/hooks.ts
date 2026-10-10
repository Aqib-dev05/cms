"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useNotices = (params: api.NoticeParams) => useQuery({ queryKey: queryKeys.notices.list(params), queryFn: () => api.fetchNotices(params), placeholderData: keepPreviousData });

const N = [queryKeys.notices.all];
export const useCreateNotice = () => useAppMutation({ mutationFn: api.createNotice, successMessage: "Notice published", invalidate: N });
export const useUpdateNotice = () => useAppMutation({ mutationFn: api.updateNotice, successMessage: "Notice updated", invalidate: N });
export const useDeleteNotice = () => useAppMutation({ mutationFn: api.deleteNotice, successMessage: "Notice deleted", invalidate: N });
