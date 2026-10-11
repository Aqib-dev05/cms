/**
 * Duties a head clerk can hand to an assistant (CLERK role) with checkboxes.
 * Dependency-free on purpose — the seed scripts import it too.
 * A duty is nothing more than a bundle of permission codes (stored as UserPermission grants).
 */
export const CLERK_DUTIES = [
  "STUDENT_RECORDS",
  "FEE_RECORDS",
  "PAYMENT_COLLECTION",
  "PAYMENT_VERIFICATION",
  "COLLEGE_FUND",
  "ADMISSIONS",
  "REPORTS",
] as const;

export type ClerkDuty = (typeof CLERK_DUTIES)[number];

export interface DutyMeta {
  label:       string;
  description: string;
  permissions: string[];
}

export const DUTY_META: Record<ClerkDuty, DutyMeta> = {
  STUDENT_RECORDS: {
    label: "Student records",
    description: "View, add and edit student records.",
    permissions: ["student.read", "student.create", "student.update"],
  },
  FEE_RECORDS: {
    label: "Fee records & challans",
    description: "Create invoices, bulk-generate and print fee challans, view fee history.",
    permissions: ["fee.read", "fee.create", "fee.update", "student.read"],
  },
  PAYMENT_COLLECTION: {
    label: "Payment collection",
    description: "Receive fee payments (they wait for verification).",
    permissions: ["payment.read", "payment.create", "fee.read", "student.read"],
  },
  PAYMENT_VERIFICATION: {
    label: "Payment verification",
    description: "Verify or reject received payments.",
    permissions: ["payment.read", "payment.verify", "fee.read"],
  },
  COLLEGE_FUND: {
    label: "College fund",
    description: "Record donations, grants and expenses in the fund ledger.",
    permissions: ["fund.read", "fund.create"],
  },
  ADMISSIONS: {
    label: "Admissions",
    description: "View and enter admission applications.",
    permissions: ["admission.read", "admission.create"],
  },
  REPORTS: {
    label: "Reports",
    description: "Defaulters, daily collection and fund reports.",
    permissions: ["fee.read", "payment.read", "fund.read", "finance.report"],
  },
};

export function isClerkDuty(value: string): value is ClerkDuty {
  return (CLERK_DUTIES as readonly string[]).includes(value);
}

/** Union of permission codes for a set of duties. */
export function permissionsForDuties(duties: readonly string[]): string[] {
  const set = new Set<string>();
  for (const d of duties) {
    if (isClerkDuty(d)) DUTY_META[d].permissions.forEach((p) => set.add(p));
  }
  return [...set];
}
