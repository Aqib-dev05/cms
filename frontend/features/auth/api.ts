import { api } from "@/lib/api";
import type { LoginInput } from "@/lib/validators";
import type { ApiResponse, AuthUser } from "@/types";

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export async function loginRequest(input: LoginInput): Promise<LoginResult> {
  const { data } = await api.post<ApiResponse<LoginResult>>("/auth/login", input);
  if (!data.data) throw new Error(data.message || "Login failed");
  return data.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout");
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>("/auth/me");
  if (!data.data) throw new Error(data.message || "Could not load profile");
  return data.data;
}
