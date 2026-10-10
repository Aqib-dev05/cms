import { getData, getDataOr, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { FeeStatus, FeeStructure, FeeType, FinanceSummary, Invoice, InvoiceItemBody, MyFinance, PaymentMethod } from "./types";

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
