import { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes } from "../../utils/response";
import * as svc from "./analytics.service";
import { parseMonths } from "./analytics.utils";

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getOverview());
});

export const getFeeTrend = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getFeeTrend(parseMonths(req.query.months)));
});

export const getAttendanceTrend = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getAttendanceTrend(parseMonths(req.query.months)));
});

export const getEnrollmentByProgram = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getEnrollmentByProgram());
});
