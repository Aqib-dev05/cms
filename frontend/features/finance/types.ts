export type FeeStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE" | "WAIVED";
export const FEE_STATUSES: FeeStatus[] = ["UNPAID", "PARTIAL", "PAID", "OVERDUE", "WAIVED"];
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "ONLINE" | "CHEQUE";

export interface FeeType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface FeeStructureItem {
  id: string;
  feeTypeId: string;
  amount: number;
  isRequired: boolean;
  feeType: { name: string; description?: string | null };
}
export interface FeeStructure {
  id: string;
  name: string;
  programId: string;
  session: string;
  isActive: boolean;
  program: { name: string; code: string };
  items: FeeStructureItem[];
}

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export const VERIFICATION_STATUSES: VerificationStatus[] = ["PENDING", "VERIFIED", "REJECTED"];

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionId: string | null;
  paidAt: string;
  remarks: string | null;
  receivedById?: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  verificationNote?: string | null;
}

/** A payment as listed in the verification queue (with student / invoice / user names attached). */
export interface PaymentRow extends Payment {
  receivedByName: string | null;
  verifiedByName: string | null;
  invoice: {
    id: string;
    invoiceNo: string;
    totalAmount: number;
    dueAmount: number;
    studentProfile: { registrationNo: string; firstName: string; lastName: string };
  };
}

export interface BulkInvoiceResult {
  created: number;
  skipped: number;
  totalAmount: number;
  invoiceIds: string[];
}

export interface DefaulterRow {
  id: string;
  invoiceNo: string;
  dueAmount: number;
  dueDate: string;
  status: FeeStatus;
  semester: string | null;
  studentProfile: { registrationNo: string; firstName: string; lastName: string; phone: string | null; program: { code: string } };
}

export interface DailyCollection {
  from: string;
  to: string;
  count: number;
  verifiedTotal: number;
  byMethod: { method: PaymentMethod; total: number }[];
  byStatus: Record<VerificationStatus, number>;
  payments: PaymentRow[];
}
export interface Discount {
  id: string;
  reason: string;
  amount: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentProfileId: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: FeeStatus;
  dueDate: string;
  issuedAt: string;
  semester: string | null;
  remarks: string | null;
  studentProfile?: { registrationNo: string; firstName: string; lastName: string; program?: { name: string; code: string } };
  payments: Payment[];
  discounts: Discount[];
}

export interface FinanceSummary {
  totalCollected: number;
  totalDue: number;
  overdueCount: number;
  pendingVerificationCount?: number;
  pendingVerificationAmount?: number;
  byStatus: { status: FeeStatus; _count: { id: number }; _sum: { totalAmount: number | null } }[];
}

export interface MyFinance {
  invoices: Invoice[];
  summary: { totalBilled: number; totalPaid: number; totalDue: number };
}

export interface InvoiceItemBody {
  feeTypeId: string;
  amount: number;
}
