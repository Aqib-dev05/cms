import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import { ownStudentProfileId } from "../../utils/student-scope";
import * as svc from "./finance.service";

const feeTypeSchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(300).optional(),
});

const feeStructureSchema = z.object({
  name:      z.string().min(2).max(100),
  programId: z.string().uuid(),
  session:   z.string().min(2).max(20),
  items: z.array(z.object({
    feeTypeId:  z.string().uuid(),
    amount:     z.number().positive(),
    isRequired: z.boolean().optional(),
  })).min(1),
});

const invoiceSchema = z.object({
  studentProfileId: z.string().uuid(),
  feeStructureId:   z.string().uuid().optional(),
  semester:         z.string().optional(),
  dueDate:          z.string().transform((v) => new Date(v)),
  items: z.array(z.object({
    feeTypeId: z.string().uuid(),
    amount:    z.number().positive(),
  })).min(1),
  remarks: z.string().max(300).optional(),
});

const paymentSchema = z.object({
  invoiceId:     z.string().uuid(),
  amount:        z.number().positive(),
  method:        z.enum(["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE"]),
  transactionId: z.string().optional(),
  remarks:       z.string().max(300).optional(),
});

const discountSchema = z.object({
  invoiceId: z.string().uuid(),
  reason:    z.string().min(5).max(300),
  amount:    z.number().positive(),
});

// Fee Types
export const getFeeTypes = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getFeeTypes());
});
export const createFeeType = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.created(res, await svc.createFeeType(feeTypeSchema.parse(req.body)), "Fee type created");
});
export const updateFeeType = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.updateFeeType(req.params.id, feeTypeSchema.partial().parse(req.body)), "Updated");
});

// Fee Structures
export const getFeeStructures = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getFeeStructures(req.query.programId as string | undefined));
});
export const getFeeStructure = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getFeeStructureById(req.params.id));
});
export const createFeeStructure = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.created(res, await svc.createFeeStructure(feeStructureSchema.parse(req.body)), "Fee structure created");
});

// Invoices
export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);

  // Students only ever see their own invoices, whatever filter they send
  let studentProfileId = req.query.studentProfileId as string | undefined;
  if (req.user.roleName === "STUDENT") {
    const own = await ownStudentProfileId(req.user.userId);
    if (!own) {
      ApiRes.paginated(res, [], buildPaginationMeta(0, page, limit));
      return;
    }
    studentProfileId = own;
  }

  const { invoices, total } = await svc.getInvoices({
    page, limit,
    studentProfileId,
    status:           req.query.status           as string | undefined,
  });
  ApiRes.paginated(res, invoices, buildPaginationMeta(total, page, limit));
});
export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const invoice = await svc.getInvoiceById(req.params.id);
  if (req.user.roleName === "STUDENT") {
    const own = await ownStudentProfileId(req.user.userId);
    // 404 (not 403) so invoice ids can't be probed
    if (!own || invoice.studentProfileId !== own) throw AppError.notFound("Invoice not found");
  }
  ApiRes.success(res, invoice);
});
export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.created(res, await svc.createInvoice(invoiceSchema.parse(req.body), req.user.userId), "Invoice created");
});

const bulkInvoiceSchema = z.object({
  feeStructureId:    z.string().uuid(),
  dueDate:           z.string().transform((v) => new Date(v)),
  semester:          z.string().max(50).optional(),
  remarks:           z.string().max(300).optional(),
  studentProfileIds: z.array(z.string().uuid()).min(1).optional(),
  currentSemester:   z.number().int().min(1).max(12).optional(),
});

export const bulkCreateInvoices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = bulkInvoiceSchema.parse(req.body);
  ApiRes.created(res, await svc.bulkCreateInvoices(dto, req.user.userId), "Challans generated");
});

// Payments
export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = paymentSchema.parse(req.body);
  ApiRes.created(res, await svc.recordPayment(dto, req.user.userId), "Payment recorded");
});

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const status = z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional().parse(req.query.status);
  const { payments, total } = await svc.listPayments({
    page, limit, status,
    invoiceId: req.query.invoiceId as string | undefined,
    search:    req.query.search    as string | undefined,
  });
  ApiRes.paginated(res, payments, buildPaginationMeta(total, page, limit));
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { note } = z.object({ note: z.string().max(300).optional() }).parse(req.body ?? {});
  ApiRes.success(res, await svc.verifyPayment(req.params.id, req.user, note), "Payment verified");
});

export const rejectPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { note } = z.object({ note: z.string().min(5).max(300) }).parse(req.body ?? {});
  ApiRes.success(res, await svc.rejectPayment(req.params.id, req.user, note), "Payment rejected");
});

// Reports
export const getDefaulters = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { invoices, total, totalOutstanding } = await svc.getDefaulters({
    page, limit, programId: req.query.programId as string | undefined,
  });
  res.status(200).json({
    success: true, message: "Success", data: invoices,
    meta: { ...buildPaginationMeta(total, page, limit), totalOutstanding },
  });
});

export const getDailyCollection = asyncHandler(async (req: Request, res: Response) => {
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.query.date)
    ?? new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10); // today in Pakistan time
  const start = new Date(`${day}T00:00:00+05:00`);
  const end   = new Date(`${day}T23:59:59.999+05:00`);
  ApiRes.success(res, await svc.getDailyCollection(start, end));
});

// Discounts
export const applyDiscount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = discountSchema.parse(req.body);
  ApiRes.success(res, await svc.applyDiscount({ ...dto, approvedById: req.user.userId }), "Discount applied");
});

// Summaries
export const getFinanceSummary = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getFinanceSummary());
});
export const getMyFinance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.success(res, await svc.getStudentFinanceSummary(req.user.userId));
});
export const getStudentFinance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  if (req.user.roleName === "STUDENT" && req.user.userId !== req.params.userId) {
    throw AppError.forbidden("You can only view your own fee details");
  }
  ApiRes.success(res, await svc.getStudentFinanceSummary(req.params.userId));
});
