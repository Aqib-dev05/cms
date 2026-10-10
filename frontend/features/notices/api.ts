import { getData, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { Notice, NoticeBody } from "./types";

export interface NoticeParams extends PageParams {
  active?: boolean;
  audience?: string;
}
export const fetchNotices = ({ active, ...rest }: NoticeParams): Promise<PaginatedResponse<Notice>> => fetchPaginated<Notice, PageParams & { active?: string }>("/notices", { ...rest, ...(active ? { active: "true" } : {}) });
export const fetchNotice = (id: string) => getData<Notice>(`/notices/${id}`);
// New notices are published immediately: the list endpoint only returns published notices,
// so a saved draft would be invisible to everyone.
export const createNotice = (b: NoticeBody) => sendData<Notice>("post", "/notices", { ...b, publishNow: true });
export const updateNotice = ({ id, ...b }: Partial<NoticeBody> & { id: string }) => sendData<Notice>("patch", `/notices/${id}`, b);
export const deleteNotice = (id: string) => sendData("delete", `/notices/${id}`);
