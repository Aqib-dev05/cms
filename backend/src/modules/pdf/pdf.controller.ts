import { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import * as svc from "./pdf.service";

export const getFeeReceipt = asyncHandler(async (req: Request, res: Response) => {
  await svc.generateFeeReceipt(req.params.invoiceId, res);
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
