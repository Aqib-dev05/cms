import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { store } from "@/store";
import { clearAuth, tokenRefreshed } from "@/store/slices/auth.slice";
import type { ApiResponse } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Refresh tokens rotate on the backend (old one is revoked), so concurrent
 * refresh calls would invalidate each other. Share a single in-flight promise.
 */
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiResponse<{ accessToken: string }>>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data.data?.accessToken;
        if (!token) throw new Error("No access token in refresh response");
        store.dispatch(tokenRefreshed(token));
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        store.dispatch(clearAuth());
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.assign("/login");
        }
      }
    }
    return Promise.reject(error);
  }
);

/** Turn any thrown value into a user-facing message. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiResponse> | undefined;
    if (data?.message) return data.message;
    if (error.code === "ERR_NETWORK") return "Cannot reach the server. Check your connection.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
