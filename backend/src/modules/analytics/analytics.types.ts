export interface AnalyticsOverview {
  generatedAt: string;
  students: { active: number };
  staff: { active: number };
  academics: { departments: number; programs: number };
  fees: {
    /** sum of payments received in the current month */
    collectedThisMonth: number;
    /** sum of dueAmount across unpaid / partial / overdue invoices */
    outstanding: number;
    /** unpaid / partial / overdue invoices whose due date has passed */
    overdueInvoices: number;
  };
  attendance: {
    /** (PRESENT + LATE) / all records this month, in %, null when nothing is marked yet */
    rateThisMonth: number | null;
    /** active students below 75% over the last 90 days (min. 5 records) */
    atRiskStudents: number;
  };
  complaints: { open: number };
  admissions: { pending: number };
  library: { issued: number; overdue: number };
}

export interface FeeTrendPoint {
  /** "YYYY-MM" (college local month) */
  month: string;
  /** payments received */
  collected: number;
  /** invoices issued, net of discount */
  billed: number;
}

export interface AttendanceTrendPoint {
  month: string;
  /** % or null when no attendance was marked that month */
  rate: number | null;
  records: number;
}

export interface EnrollmentByProgram {
  programId: string;
  code: string;
  name: string;
  students: number;
}
