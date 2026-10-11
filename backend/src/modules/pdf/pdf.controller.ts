import { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { z } from "zod";
import * as svc from "./pdf.service";
import * as challan from "./challan.service";

export const getFeeReceipt = asyncHandler(async (req: Request, res: Response) => {
  await svc.generateFeeReceipt(req.params.invoiceId, res);
});

export const getFeeChallan = asyncHandler(async (req: Request, res: Response) => {
  await challan.generateFeeChallan(req.params.invoiceId, res);
});

const bulkChallanQuery = z.object({
  feeStructureId: z.string().uuid().optional(),
  semester:       z.string().max(50).optional(),
  invoiceIds:     z.string().optional(), // comma separated
});

export const getBulkChallans = asyncHandler(async (req: Request, res: Response) => {
  const q = bulkChallanQuery.parse(req.query);
  const invoiceIds = q.invoiceIds?.split(",").map((s) => s.trim()).filter(Boolean);
  if (invoiceIds?.some((id) => !z.string().uuid().safeParse(id).success)) throw AppError.badRequest("Invalid invoice id");
  await challan.generateBulkChallans({ feeStructureId: q.feeStructureId, semester: q.semester, invoiceIds }, res);
});

export const getReportCard = asyncHandler(async (req: Request, res: Response) => {
  const { userId, semesterId } = req.params;
  await svc.generateReportCard(userId, semesterId, res);
});

export const getMyReportCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { semesterId } = req.params;
  await svc.generateReportCard(req.user.userId, semesterId, res);
});
