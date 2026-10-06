import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { generateInvoiceNo } from "../../utils/reg-no";

export interface CreateFeeTypeDto  { name: string; description?: string; }
export interface UpdateFeeTypeDto  { name?: string; description?: string; isActive?: boolean; }

export interface CreateFeeStructureDto {
  name:      string;
  programId: string;
  session:   string;
  items: {
    feeTypeId:  string;
    amount:     number;
    isRequired?: boolean;
  }[];
}

export interface CreateInvoiceDto {
  studentProfileId: string;
  feeStructureId?:  string;
  semester?:        string;
  dueDate:          Date;
  items: {
    feeTypeId:  string;
    amount:     number;
  }[];
  remarks?: string;
}

export interface RecordPaymentDto {
  invoiceId:     string;
  amount:        number;
  method:        "CASH" | "BANK_TRANSFER" | "ONLINE" | "CHEQUE";
  transactionId?: string;
  remarks?:      string;
}

export interface ApplyDiscountDto {
  invoiceId:    string;
  reason:       string;
  amount:       number;
  approvedById?: string;
}

// ─── Fee Types ────────────────────────────────────────────────

export async function getFeeTypes() {
  return prisma.feeType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createFeeType(dto: CreateFeeTypeDto) {
  const existing = await prisma.feeType.findUnique({ where: { name: dto.name } });
  if (existing) throw AppError.conflict("Fee type already exists");
  return prisma.feeType.create({ data: dto });
}

export async function updateFeeType(id: string, dto: UpdateFeeTypeDto) {
  const ft = await prisma.feeType.findUnique({ where: { id } });
  if (!ft) throw AppError.notFound("Fee type not found");
  return prisma.feeType.update({ where: { id }, data: dto });
}

// ─── Fee Structures ───────────────────────────────────────────

export async function getFeeStructures(programId?: string) {
  return prisma.feeStructure.findMany({
    where: {
      ...(programId && { programId }),
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    include: {
      program: { select: { name: true, code: true } },
      items: {
        include: { feeType: { select: { name: true } } },
      },
    },
  });
}

export async function getFeeStructureById(id: string) {
  const fs = await prisma.feeStructure.findUnique({
    where: { id },
    include: {
      program: { select: { name: true, code: true } },
      items: { include: { feeType: true } },
    },
  });
  if (!fs) throw AppError.notFound("Fee structure not found");
  return fs;
}

export async function createFeeStructure(dto: CreateFeeStructureDto) {
  const program = await prisma.program.findUnique({ where: { id: dto.programId } });
  if (!program) throw AppError.notFound("Program not found");

  return prisma.feeStructure.create({
    data: {
      name:      dto.name,
      programId: dto.programId,
      session:   dto.session,
      items: {
        create: dto.items.map((item) => ({
          feeTypeId:  item.feeTypeId,
          amount:     item.amount,
          isRequired: item.isRequired ?? true,
        })),
      },
    },
    include: {
      items: { include: { feeType: { select: { name: true } } } },
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────

export async function getInvoices(params: {
  studentProfileId?: string;
  status?:           string;
  page:              number;
  limit:             number;
}) {
  const { page, limit, studentProfileId, status } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(studentProfileId && { studentProfileId }),
    ...(status           && { status: status as "UNPAID" }),
  };

  const [invoices, total] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        studentProfile: {
          select: { registrationNo: true, firstName: true, lastName: true },
        },
        payments:  { orderBy: { paidAt: "desc" } },
        discounts: true,
      },
    }),
    prisma.feeInvoice.count({ where }),
  ]);

  return { invoices, total };
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id },
    include: {
      studentProfile: {
        select: {
          registrationNo: true, firstName: true, lastName: true,
          program: { select: { name: true, code: true } },
        },
      },
      payments:  { orderBy: { paidAt: "desc" } },
      discounts: true,
    },
  });
  if (!invoice) throw AppError.notFound("Invoice not found");
  return invoice;
}

export async function createInvoice(dto: CreateInvoiceDto) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: dto.studentProfileId },
  });
  if (!student) throw AppError.notFound("Student not found");

  const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);
  const invoiceNo   = await generateInvoiceNo();

  return prisma.feeInvoice.create({
    data: {
      invoiceNo,
      studentProfileId: dto.studentProfileId,
      feeStructureId:   dto.feeStructureId,
      semester:         dto.semester,
      totalAmount,
      dueAmount:        totalAmount,
      dueDate:          dto.dueDate,
      remarks:          dto.remarks,
    },
    include: {
      studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } },
    },
  });
}

// ─── Payments ─────────────────────────────────────────────────

export async function recordPayment(dto: RecordPaymentDto, receivedById: string) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: dto.invoiceId },
    include: { payments: true, discounts: true },
  });
  if (!invoice) throw AppError.notFound("Invoice not found");

  if (invoice.status === "PAID") throw AppError.badRequest("Invoice is already fully paid");

  if (dto.amount <= 0) throw AppError.badRequest("Payment amount must be greater than 0");
  if (dto.amount > invoice.dueAmount) {
    throw AppError.badRequest(
      `Payment amount (${dto.amount}) exceeds due amount (${invoice.dueAmount})`
    );
  }

  const newPaid    = invoice.paidAmount + dto.amount;
  const newDue     = invoice.totalAmount - invoice.discountAmount - newPaid;
  const newStatus  = newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

  const [payment] = await prisma.$transaction([
    prisma.feePayment.create({
      data: {
        invoiceId:     dto.invoiceId,
        amount:        dto.amount,
        method:        dto.method,
        transactionId: dto.transactionId,
        receivedById,
        remarks:       dto.remarks,
      },
    }),
    prisma.feeInvoice.update({
      where: { id: dto.invoiceId },
      data: {
        paidAmount: newPaid,
        dueAmount:  Math.max(0, newDue),
        status:     newStatus as "PAID",
      },
    }),
  ]);

  return payment;
}

// ─── Discounts ────────────────────────────────────────────────

export async function applyDiscount(dto: ApplyDiscountDto) {
  const invoice = await prisma.feeInvoice.findUnique({ where: { id: dto.invoiceId } });
  if (!invoice) throw AppError.notFound("Invoice not found");

  if (invoice.status === "PAID") throw AppError.badRequest("Cannot apply discount to a paid invoice");

  const newDiscount   = invoice.discountAmount + dto.amount;
  const newDue        = invoice.totalAmount - newDiscount - invoice.paidAmount;

  if (newDue < 0) throw AppError.badRequest("Discount exceeds remaining balance");

  await prisma.$transaction([
    prisma.feeDiscount.create({
      data: {
        invoiceId:    dto.invoiceId,
        reason:       dto.reason,
        amount:       dto.amount,
        approvedById: dto.approvedById,
      },
    }),
    prisma.feeInvoice.update({
      where: { id: dto.invoiceId },
      data: {
        discountAmount: newDiscount,
        dueAmount:      Math.max(0, newDue),
        status:         newDue <= 0 ? "PAID" : invoice.paidAmount > 0 ? "PARTIAL" : "UNPAID",
      },
    }),
  ]);

  return prisma.feeInvoice.findUnique({ where: { id: dto.invoiceId } });
}

// ─── Finance Overview ─────────────────────────────────────────

export async function getFinanceSummary() {
  const [totalCollected, totalDue, overdueCount, invoiceStats] = await Promise.all([
    prisma.feePayment.aggregate({ _sum: { amount: true } }),
    prisma.feeInvoice.aggregate({ _sum: { dueAmount: true }, where: { status: { not: "PAID" } } }),
    prisma.feeInvoice.count({ where: { status: "OVERDUE" } }),
    prisma.feeInvoice.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum:   { totalAmount: true },
    }),
  ]);

  return {
    totalCollected: totalCollected._sum.amount ?? 0,
    totalDue:       totalDue._sum.dueAmount    ?? 0,
    overdueCount,
    byStatus:       invoiceStats,
  };
}

export async function getStudentFinanceSummary(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student not found");

  const invoices = await prisma.feeInvoice.findMany({
    where: { studentProfileId: profile.id },
    include: { payments: true, discounts: true },
    orderBy: { createdAt: "desc" },
  });

  const totalBilled  = invoices.reduce((s: number, i: { totalAmount: number }) => s + i.totalAmount, 0);
  const totalPaid    = invoices.reduce((s: number, i: { paidAmount: number }) => s + i.paidAmount, 0);
  const totalDue     = invoices.reduce((s: number, i: { dueAmount: number }) => s + i.dueAmount, 0);

  return { invoices, summary: { totalBilled, totalPaid, totalDue } };
}
