export type FundType = "INCOME" | "EXPENSE";

export interface FundCategories {
  INCOME: string[];
  EXPENSE: string[];
}

export interface FundEntry {
  id: string;
  type: FundType;
  category: string;
  source: string | null;
  amount: number;
  entryDate: string;
  description: string;
  reference: string | null;
  isVoided: boolean;
  voidReason: string | null;
  recordedBy: { username: string; staffProfile: { firstName: string; lastName: string } | null };
}

export interface FundTotals {
  feeCollected: number;
  otherIncome: number;
  expenses: number;
  net: number;
}

export interface FundSummary {
  balance: number;
  allTime: FundTotals;
  period: FundTotals & { from: string | null; to: string | null };
  byCategory: { type: FundType; category: string; total: number }[];
  monthly: { month: string; income: number; expense: number }[];
}
