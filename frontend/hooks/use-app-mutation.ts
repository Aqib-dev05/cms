"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";

interface Options<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** toast on success; may be a function of the result */
  successMessage?: string | ((data: TData, vars: TVars) => string);
  /** query-key prefixes to invalidate on success */
  invalidate?: QueryKey[];
  /** set false to handle errors yourself (e.g. map them onto a form field) */
  toastError?: boolean;
}

/**
 * useMutation + toast + invalidation in one place.
 * Call-level `mutate(vars, { onSuccess })` callbacks still run after these.
 */
export function useAppMutation<TData = unknown, TVars = void>({ mutationFn, successMessage, invalidate, toastError = true }: Options<TData, TVars>) {
  const queryClient = useQueryClient();
  return useMutation<TData, unknown, TVars>({
    mutationFn,
    onSuccess: (data, vars) => {
      invalidate?.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      if (successMessage) toast.success(typeof successMessage === "function" ? successMessage(data, vars) : successMessage);
    },
    onError: (err) => {
      if (toastError) toast.error(getErrorMessage(err));
    },
  });
}
