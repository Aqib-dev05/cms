import { getData, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { FundCategories, FundEntry, FundSummary, FundType } from "./types";

export interface FundEntryParams extends PageParams {
  type?: FundType;
  category?: string;
  search?: string;
  from?: string;
  to?: string;
}

export const fetchFundCategories = () => getData<FundCategories>("/fund/categories");
export const fetchFundSummary = (params: { from?: string; to?: string }) => getData<FundSummary>("/fund/summary", params);
export const fetchFundEntries = (params: FundEntryParams): Promise<PaginatedResponse<FundEntry>> => fetchPaginated<FundEntry, FundEntryParams>("/fund/entries", params);
export const createFundEntry = (b: { type: FundType; category: string; source?: string; amount: number; entryDate: string; description: string; reference?: string }) => sendData<FundEntry>("post", "/fund/entries", b);
export const voidFundEntry = ({ id, reason }: { id: string; reason: string }) => sendData<FundEntry>("post", `/fund/entries/${id}/void`, { reason });
