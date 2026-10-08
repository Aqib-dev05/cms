import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export interface PageParams {
  page: number;
  limit: number;
  search?: string;
}

export const PAGE_SIZES = [10, 20, 50] as const;

/**
 * GET a paginated backend list (`{ data: [], meta: { total, page, limit, totalPages } }`).
 * Empty/undefined params are dropped so they don't reach the API as `search=`.
 */
export async function fetchPaginated<T, P extends PageParams = PageParams>(
  url: string,
  params: P
): Promise<PaginatedResponse<T>> {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
  const { data } = await api.get<PaginatedResponse<T>>(url, { params: clean });
  return data;
}
