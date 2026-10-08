"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getRoleHome } from "@/config/roles";
import { disconnectSocket } from "@/lib/socket";
import { useAppDispatch } from "@/store/hooks";
import { clearAuth, setCredentials } from "@/store/slices/auth.slice";
import { loginRequest, logoutRequest } from "./api";

export function useLogin() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: ({ user, accessToken }) => {
      dispatch(setCredentials({ user, accessToken }));
      toast.success(`Welcome back, ${user.username}`);
      router.replace(getRoleHome(user.role.name));
    },
  });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      // Clear locally even if the server call failed (e.g. network down).
      disconnectSocket();
      dispatch(clearAuth());
      queryClient.clear();
      router.replace("/login");
    },
  });
}
