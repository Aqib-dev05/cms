"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

export const useUsers = (params: api.UserListParams) => useQuery({ queryKey: queryKeys.users.list(params), queryFn: () => api.fetchUsers(params), placeholderData: keepPreviousData });
export const useRoles = () => useQuery({ queryKey: queryKeys.users.roles, queryFn: api.fetchRoles, staleTime: 10 * 60_000 });

const USERS = [queryKeys.users.all, queryKeys.staff.all, queryKeys.students.all];
export const useCreateStaff = () => useAppMutation({ mutationFn: api.createStaff, successMessage: (u) => `Account created for @${u.username}`, invalidate: USERS, toastError: false });
export const useToggleUserStatus = () => useAppMutation({ mutationFn: api.toggleUserStatus, successMessage: (u) => `@${u.username} ${u.isActive ? "activated" : "deactivated"}`, invalidate: USERS });
export const useResetPassword = () => useAppMutation({ mutationFn: api.resetUserPassword, successMessage: "Password reset. All of that user's sessions were signed out." });
export const useUpdateStaffProfile = () => useAppMutation({ mutationFn: api.updateStaffProfile, successMessage: "Profile updated", invalidate: USERS });
