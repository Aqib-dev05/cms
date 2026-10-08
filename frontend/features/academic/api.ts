import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { Program } from "./types";

export async function fetchPrograms(): Promise<Program[]> {
  const { data } = await api.get<ApiResponse<Program[]>>("/academic/programs");
  return data.data ?? [];
}
