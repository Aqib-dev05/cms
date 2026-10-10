import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

/** GET → `data.data`, throwing a readable error if the envelope is empty. */
export async function getData<T>(url: string, params?: object): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url, { params });
  if (data.data === undefined || data.data === null) throw new Error(data.message || "No data returned");
  return data.data;
}

/** Like `getData`, but an empty envelope is fine (returns the fallback). */
export async function getDataOr<T>(url: string, fallback: T, params?: object): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url, { params });
  return data.data ?? fallback;
}

export async function sendData<T = unknown>(method: "post" | "patch" | "put" | "delete", url: string, body?: unknown): Promise<T> {
  const { data } = await api.request<ApiResponse<T>>({ method, url, data: body });
  return data.data as T;
}

/** Download a binary (PDF) endpoint and open it in a new tab. */
export async function openPdf(url: string): Promise<void> {
  const { data } = await api.get<Blob>(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  window.open(blobUrl, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
