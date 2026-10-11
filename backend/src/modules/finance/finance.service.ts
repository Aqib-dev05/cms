import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { generateInvoiceNo } from "../../utils/reg-no";
import { audit, AUDIT_ACTIONS } from "../../utils/audit-logger";
import { emitToRole, emitToUser, SOCKET_EVENTS } from "../../lib/socket";

const FINANCE_ROLES = ["ADMIN", "HEAD_CLERK", "CLERK"] as const;

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

export async function createInvoice(dto: CreateInvoiceDto, createdById?: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: dto.studentProfileId },
  });
  if (!student) throw AppError.notFound("Student not found");

  // Resolve fee-head names so the challan can print them
  const feeTypes = await prisma.feeType.findMany({
    where: { id: { in: dto.items.map((i) => i.feeTypeId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(feeTypes.map((f: { id: string; name: string }) => [f.id, f.name]));
  const missing = dto.items.find((i) => !nameById.has(i.feeTypeId));
  if (missing) throw AppError.notFound("One of the fee types was not found");

  const lineItems = dto.items.map((i) => ({
    feeTypeId: i.feeTypeId,
    name:      nameById.get(i.feeTypeId) as string,
    amount:    i.amount,
  }));
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const invoiceNo   = await generateInvoiceNo();

  const invoice = await prisma.feeInvoice.create({
    data: {
      invoiceNo,
      studentProfileId: dto.studentProfileId,
      feeStructureId:   dto.feeStructureId,
      semester:         dto.semester,
      totalAmount,
      dueAmount:        totalAmount,
      dueDate:          dto.dueDate,
      remarks:          dto.remarks,
      lineItems,
    },
    include: {
      studentProfile: { select: { userId: true, registrationNo: true, firstName: true, lastName: true } },
    },
  });

  if (createdById) {
    await audit({
      userId: createdById, action: AUDIT_ACTIONS.INVOICE_CREATE, module: "finance", entityId: invoice.id,
      newData: { invoiceNo, totalAmount, studentProfileId: dto.studentProfileId },
    });
  }

  const payload = {
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    totalAmount: invoice.totalAmount,
    dueDate: invoice.dueDate,
  };
  emitToUser(invoice.studentProfile.userId, SOCKET_EVENTS.INVOICE_CREATED, payload);
  for (const role of FINANCE_ROLES) emitToRole(role, SOCKET_EVENTS.INVOICE_CREATED, payload);

  return invoice;
}

export interface BulkInvoiceDto {
  feeStructureId:     string;
  dueDate:            Date;
  semester?:          string;
  remarks?:           string;
  /** Limit to these students; default = every ACTIVE student of the structure's program. */
  studentProfileIds?: string[];
  /** Only students currently in this semester number. */
  currentSemester?:   number;
}

/**
 * Challan run: one invoice per student from a fee structure.
 * Students that already hold an invoice for the same structure + semester label are skipped,
 * so pressing the button twice never double-bills anybody.
 */
export async function bulkCreateInvoices(dto: BulkInvoiceDto, createdById: string) {
  const structure = await prisma.feeStructure.findUnique({
    where: { id: dto.feeStructureId },
    include: { items: { include: { feeType: { select: { name: true } } } } },
  });
  if (!structure) throw AppError.notFound("Fee structure not found");
  if (structure.items.length === 0) throw AppError.badRequest("Fee structure has no fee heads");

  const lineItems = structure.items.map((i: { feeTypeId: string; amount: number; feeType: { name: string } }) => ({
    feeTypeId: i.feeTypeId, name: i.feeType.name, amount: i.amount,
  }));
  const totalAmount = lineItems.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);

  const students = await prisma.studentProfile.findMany({
    where: {
      programId: structure.programId,
      status:    "ACTIVE",
      ...(dto.currentSemester && { currentSemester: dto.currentSemester }),
      ...(dto.studentProfileIds && { id: { in: dto.studentProfileIds } }),
    },
    select: { id: true, userId: true },
  });
  if (students.length === 0) throw AppError.badRequest("No active students match this selection");

  const already = await prisma.feeInvoice.findMany({
    where: {
      feeStructureId: structure.id,
      semester:       dto.semester ?? null,
      studentProfileId: { in: students.map((s: { id: string }) => s.id) },
    },
    select: { studentProfileId: true },
  });
  const skipIds = new Set(already.map((a: { studentProfileId: string }) => a.studentProfileId));

  const created: { id: string; invoiceNo: string; userId: string }[] = [];
  for (const student of students as { id: string; userId: string }[]) {
    if (skipIds.has(student.id)) continue;
    const invoiceNo = await generateInvoiceNo();
    const invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNo,
        studentProfileId: student.id,
        feeStructureId:   structure.id,
        semester:         dto.semester,
        totalAmount,
        dueAmount:        totalAmount,
        dueDate:          dto.dueDate,
        remarks:          dto.remarks,
        lineItems,
      },
      select: { id: true, invoiceNo: true },
    });
    created.push({ ...invoice, userId: student.userId });
  }

  await audit({
    userId: createdById, action: "INVOICE_BULK_CREATE", module: "finance", entityId: structure.id,
    newData: { created: created.length, skipped: skipIds.size, totalAmount, semester: dto.semester ?? null },
  });

  for (const inv of created) {
    emitToUser(inv.userId, SOCKET_EVENTS.INVOICE_CREATED, {
      invoiceId: inv.id, invoiceNo: inv.invoiceNo, totalAmount, dueDate: dto.dueDate,
    });
  }
  for (const role of FINANCE_ROLES) {
    emitToRole(role, SOCKET_EVENTS.INVOICE_CREATED, { bulk: true, count: created.length });
  }

  return {
    created: created.length,
    skipped: skipIds.size,
    totalAmount,
    invoiceIds: created.map((c) => c.id),
  };
}

// ─── Payments (collect → verify) ──────────────────────────────

export async function recordPayment(dto: RecordPaymentDto, receivedById: string) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: dto.invoiceId },
    include: { payments: { where: { verificationStatus: "PENDING" }, select: { amount: true } } },
  });
  if (!invoice) throw AppError.notFound("Invoice not found");
  if (invoice.status === "PAID") throw AppError.badRequest("Invoice is already fully paid");
  if (dto.amount <= 0) throw AppError.badRequest("Payment amount must be greater than 0");

  // Money received but not yet verified still counts against what can be collected
  const pending = invoice.payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const collectable = invoice.dueAmount - pending;
  if (dto.amount > collectable) {
    throw AppError.badRequest(
      `Payment amount (${dto.amount}) exceeds the collectable balance (${Math.max(0, collectable)})` +
      (pending > 0 ? ` — ${pending} is already received and waiting for verification` : "")
    );
  }

  const payment = await prisma.feePayment.create({
    data: {
      invoiceId:     dto.invoiceId,
      amount:        dto.amount,
      method:        dto.method,
      transactionId: dto.transactionId,
      receivedById,
      remarks:       dto.remarks,
      verificationStatus: "PENDING",
    },
  });

  await audit({
    userId: receivedById, action: AUDIT_ACTIONS.PAYMENT_RECORD, module: "finance", entityId: payment.id,
    newData: { invoiceNo: invoice.invoiceNo, amount: dto.amount, method: dto.method },
  });

  const payload = { paymentId: payment.id, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, amount: dto.amount, verificationStatus: "PENDING" };
  for (const role of FINANCE_ROLES) emitToRole(role, SOCKET_EVENTS.PAYMENT_RECEIVED, payload);

  return payment;
}

export async function verifyPayment(paymentId: string, actor: { userId: string; roleName: string }, note?: string) {
  const payment = await prisma.feePayment.findUnique({
    where: { id: paymentId },
    include: { invoice: { include: { studentProfile: { select: { userId: true } } } } },
  });
  if (!payment) throw AppError.notFound("Payment not found");
  if (payment.verificationStatus !== "PENDING") {
    throw AppError.badRequest(`Payment is already ${payment.verificationStatus.toLowerCase()}`);
  }

  const invoice = payment.invoice;
  if (payment.amount > invoice.dueAmount) {
    throw AppError.badRequest(
      `Payment (${payment.amount}) is more than the invoice's remaining due (${invoice.dueAmount}) — reject it or fix the invoice first`
    );
  }

  const newPaid   = invoice.paidAmount + payment.amount;
  const newDue    = Math.max(0, invoice.totalAmount - invoice.discountAmount - newPaid);
  const newStatus = newDue <= 0 ? "PAID" : "PARTIAL";

  await prisma.$transaction(async (tx) => {
    // updateMany + status guard → two verifiers can't both apply the same payment
    const claimed = await tx.feePayment.updateMany({
      where: { id: paymentId, verificationStatus: "PENDING" },
      data:  { verificationStatus: "VERIFIED", verifiedById: actor.userId, verifiedAt: new Date(), verificationNote: note },
    });
    if (claimed.count === 0) throw AppError.conflict("Payment was already processed by someone else");

    await tx.feeInvoice.update({
      where: { id: invoice.id },
      data:  { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
    });
  });

  await audit({
    userId: actor.userId, action: "PAYMENT_VERIFY", module: "finance", entityId: paymentId,
    newData: { invoiceNo: invoice.invoiceNo, amount: payment.amount, status: newStatus },
  });

  const payload = {
    invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, paymentId,
    amount: payment.amount, status: newStatus, dueAmount: newDue, verificationStatus: "VERIFIED",
  };
  emitToUser(invoice.studentProfile.userId, SOCKET_EVENTS.PAYMENT_RECEIVED, payload);
  for (const role of FINANCE_ROLES) emitToRole(role, SOCKET_EVENTS.PAYMENT_RECEIVED, payload);

  return prisma.feePayment.findUnique({ where: { id: paymentId } });
}

export async function rejectPayment(paymentId: string, actor: { userId: string; roleName: string }, note: string) {
  const payment = await prisma.feePayment.findUnique({
    where: { id: paymentId },
    include: { invoice: { select: { id: true, invoiceNo: true } } },
  });
  if (!payment) throw AppError.notFound("Payment not found");
  if (payment.verificationStatus !== "PENDING") {
    throw AppError.badRequest(`Payment is already ${payment.verificationStatus.toLowerCase()}`);
  }

  const claimed = await prisma.feePayment.updateMany({
    where: { id: paymentId, verificationStatus: "PENDING" },
    data:  { verificationStatus: "REJECTED", verifiedById: actor.userId, verifiedAt: new Date(), verificationNote: note },
  });
  if (claimed.count === 0) throw AppError.conflict("Payment was already processed by someone else");

  await audit({
    userId: actor.userId, action: "PAYMENT_REJECT", module: "finance", entityId: paymentId,
    newData: { invoiceNo: payment.invoice.invoiceNo, amount: payment.amount, note },
  });

  const payload = { paymentId, invoiceId: payment.invoice.id, invoiceNo: payment.invoice.invoiceNo, verificationStatus: "REJECTED" };
  for (const role of FINANCE_ROLES) emitToRole(role, SOCKET_EVENTS.PAYMENT_RECEIVED, payload);

  return prisma.feePayment.findUnique({ where: { id: paymentId } });
}

export async function listPayments(params: {
  page: number; limit: number;
  status?: "PENDING" | "VERIFIED" | "REJECTED";
  invoiceId?: string; search?: string;
}) {
  const { page, limit, status, invoiceId, search } = params;
  const where = {
    ...(status    && { verificationStatus: status }),
    ...(invoiceId && { invoiceId }),
    ...(search && {
      OR: [
        { transactionId: { contains: search, mode: "insensitive" as const } },
        { invoice: { invoiceNo: { contains: search, mode: "insensitive" as const } } },
        { invoice: { studentProfile: { registrationNo: { contains: search, mode: "insensitive" as const } } } },
        { invoice: { studentProfile: { firstName:      { contains: search, mode: "insensitive" as const } } } },
        { invoice: { studentProfile: { lastName:       { contains: search, mode: "insensitive" as const } } } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    prisma.feePayment.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { paidAt: "desc" },
      include: {
        invoice: {
          select: {
            id: true, invoiceNo: true, totalAmount: true, dueAmount: true,
            studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.feePayment.count({ where }),
  ]);

  // receivedById / verifiedById are plain ids — attach readable names
  const userIds = [...new Set(rows.flatMap((r: { receivedById: string | null; verifiedById: string | null }) =>
    [r.receivedById, r.verifiedById].filter((x): x is string => !!x)))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, staffProfile: { select: { firstName: true, lastName: true } } },
  });
  const nameOf = new Map(users.map((u: { id: string; username: string; staffProfile: { firstName: string; lastName: string } | null }) =>
    [u.id, u.staffProfile ? `${u.staffProfile.firstName} ${u.staffProfile.lastName}` : u.username]));

  const payments = rows.map((r: { receivedById: string | null; verifiedById: string | null }) => ({
    ...r,
    receivedByName: r.receivedById ? nameOf.get(r.receivedById) ?? null : null,
    verifiedByName: r.verifiedById ? nameOf.get(r.verifiedById) ?? null : null,
  }));
  return { payments, total };
}

// ─── Reports ──────────────────────────────────────────────────

export async function getDefaulters(params: { page: number; limit: number; programId?: string }) {
  const { page, limit, programId } = params;
  const where = {
    status:    { in: ["UNPAID", "PARTIAL", "OVERDUE"] as ("UNPAID" | "PARTIAL" | "OVERDUE")[] },
    dueAmount: { gt: 0 },
    dueDate:   { lt: new Date() },
    ...(programId && { studentProfile: { programId } }),
  };
  const [invoices, total, sum] = await Promise.all([
    prisma.feeInvoice.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { dueDate: "asc" },
      select: {
        id: true, invoiceNo: true, dueAmount: true, dueDate: true, status: true, semester: true,
        studentProfile: {
          select: { registrationNo: true, firstName: true, lastName: true, phone: true, program: { select: { code: true } } },
        },
      },
    }),
    prisma.feeInvoice.count({ where }),
    prisma.feeInvoice.aggregate({ where, _sum: { dueAmount: true } }),
  ]);
  return { invoices, total, totalOutstanding: sum._sum.dueAmount ?? 0 };
}

export async function getDailyCollection(start: Date, end: Date) {
  const payments = await prisma.feePayment.findMany({
    where: { paidAt: { gte: start, lte: end } },
    orderBy: { paidAt: "asc" },
    include: {
      invoice: {
        select: { invoiceNo: true, studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } } },
      },
    },
  });

  const byMethod = new Map<string, number>();
  const byStatus = { PENDING: 0, VERIFIED: 0, REJECTED: 0 } as Record<string, number>;
  let verifiedTotal = 0;
  for (const p of payments as { amount: number; method: string; verificationStatus: string }[]) {
    byStatus[p.verificationStatus] = (byStatus[p.verificationStatus] ?? 0) + p.amount;
    if (p.verificationStatus === "VERIFIED") {
      verifiedTotal += p.amount;
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
    }
  }
  return {
    from: start, to: end,
    count: payments.length,
    verifiedTotal,
    byMethod: [...byMethod.entries()].map(([method, total]) => ({ method, total })),
    byStatus,
    payments,
  };
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
  const pendingVerification = await prisma.feePayment.aggregate({
    _sum: { amount: true }, _count: { _all: true }, where: { verificationStatus: "PENDING" },
  });
  const [totalCollected, totalDue, overdueCount, invoiceStats] = await Promise.all([
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { verificationStatus: "VERIFIED" } }),
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
    pendingVerificationCount:  pendingVerification._count._all,
    pendingVerificationAmount: pendingVerification._sum.amount ?? 0,
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
