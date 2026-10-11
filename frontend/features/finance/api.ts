import { getData, getDataOr, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { BulkInvoiceResult, DailyCollection, DefaulterRow, FeeStatus, FeeStructure, FeeType, FinanceSummary, Invoice, InvoiceItemBody, MyFinance, PaymentMethod, PaymentRow, VerificationStatus } from "./types";

export interface InvoiceParams extends PageParams {
  studentProfileId?: string;
  status?: FeeStatus;
}

export const fetchSummary = () => getData<FinanceSummary>("/finance/summary");
export const fetchMyFinance = () => getData<MyFinance>("/finance/me");
export const fetchInvoices = (params: InvoiceParams): Promise<PaginatedResponse<Invoice>> => fetchPaginated<Invoice, InvoiceParams>("/finance/invoices", params);
export const fetchInvoice = (id: string) => getData<Invoice>(`/finance/invoices/${id}`);
export const fetchFeeTypes = () => getDataOr<FeeType[]>("/finance/fee-types", []);
export const fetchStructures = (programId?: string) => getDataOr<FeeStructure[]>("/finance/structures", [], programId ? { programId } : undefined);

export const createInvoice = (b: { studentProfileId: string; feeStructureId?: string; semester?: string; dueDate: string; items: InvoiceItemBody[]; remarks?: string }) => sendData<Invoice>("post", "/finance/invoices", b);
export const recordPayment = (b: { invoiceId: string; amount: number; method: PaymentMethod; transactionId?: string; remarks?: string }) => sendData("post", "/finance/payments", b);
export const applyDiscount = (b: { invoiceId: string; reason: string; amount: number }) => sendData("post", "/finance/discounts", b);
export const createFeeType = (b: { name: string; description?: string }) => sendData<FeeType>("post", "/finance/fee-types", b);
export const updateFeeType = ({ id, ...b }: { id: string; name?: string; description?: string }) => sendData<FeeType>("patch", `/finance/fee-types/${id}`, b);
export const createStructure = (b: { name: string; programId: string; session: string; items: { feeTypeId: string; amount: number; isRequired?: boolean }[] }) => sendData<FeeStructure>("post", "/finance/structures", b);

export interface PaymentParams extends PageParams {
  status?: VerificationStatus;
  search?: string;
}
export const fetchPayments = (params: PaymentParams): Promise<PaginatedResponse<PaymentRow>> => fetchPaginated<PaymentRow, PaymentParams>("/finance/payments", params);
export const verifyPayment = ({ id, note }: { id: string; note?: string }) => sendData("post", `/finance/payments/${id}/verify`, { note });
export const rejectPayment = ({ id, note }: { id: string; note: string }) => sendData("post", `/finance/payments/${id}/reject`, { note });

export const bulkCreateInvoices = (b: { feeStructureId: string; dueDate: string; semester: string; remarks?: string; currentSemester?: number }) => sendData<BulkInvoiceResult>("post", "/finance/invoices/bulk", b);

export type DefaultersResponse = PaginatedResponse<DefaulterRow> & { meta: { totalOutstanding: number } };
export const fetchDefaulters = (params: PageParams & { programId?: string }) => fetchPaginated<DefaulterRow, PageParams & { programId?: string }>("/finance/reports/defaulters", params) as Promise<DefaultersResponse>;
export const fetchDailyCollection = (date: string) => getData<DailyCollection>("/finance/reports/daily-collection", { date });
