import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't hammer the API on client errors (401 is handled by the axios interceptor).
          if (isAxiosError(error) && error.response && error.response.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
