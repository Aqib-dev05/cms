import { prisma } from "../config/database";

/**
 * Generates registration number in format: YYYY-CODE-NNN
 * Example: 2026-CS-041
 */
export async function generateRegistrationNo(programCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-${programCode.toUpperCase()}`;

  // Count existing students in this program this year
  const count = await prisma.studentProfile.count({
    where: {
      registrationNo: { startsWith: prefix },
    },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

/**
 * Generates college email from name + domain
 * Example: john.doe@gct.edu.pk
 */
export function generateCollegeEmail(
  firstName: string,
  lastName: string,
  domain: string
): string {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

  return `${clean(firstName)}.${clean(lastName)}@${domain}`;
}

/**
 * Generates employee ID: EMP-YYYY-NNN
 */
export async function generateEmployeeId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}`;

  const count = await prisma.staffProfile.count({
    where: { employeeId: { startsWith: prefix } },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

/**
 * Generates invoice number: INV-YYYY-NNNNNN
 */
export async function generateInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}`;

  const count = await prisma.feeInvoice.count({
    where: { invoiceNo: { startsWith: prefix } },
  });

  const seq = String(count + 1).padStart(6, "0");
  return `${prefix}-${seq}`;
}

/**
 * Generates application number: APP-YYYY-NNNNNN
 */
export async function generateApplicationNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}`;

  const count = await prisma.application.count({
    where: { applicationNo: { startsWith: prefix } },
  });

  const seq = String(count + 1).padStart(6, "0");
  return `${prefix}-${seq}`;
}
