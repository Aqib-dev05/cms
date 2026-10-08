/** Mirrors backend/src/modules/analytics/analytics.types.ts */
export interface AnalyticsOverview {
  generatedAt: string;
  students: { active: number };
  staff: { active: number };
  academics: { departments: number; programs: number };
  fees: { collectedThisMonth: number; outstanding: number; overdueInvoices: number };
  attendance: { rateThisMonth: number | null; atRiskStudents: number };
  complaints: { open: number };
  admissions: { pending: number };
  library: { issued: number; overdue: number };
}

export interface FeeTrendPoint {
  month: string;
  collected: number;
  billed: number;
}

export interface AttendanceTrendPoint {
  month: string;
  rate: number | null;
  records: number;
}

export interface EnrollmentByProgram {
  programId: string;
  code: string;
  name: string;
  students: number;
}
