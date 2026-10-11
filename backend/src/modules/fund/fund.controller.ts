import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./fund.service";

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(`${v}T00:00:00+05:00`));
const endOfDayParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(`${v}T23:59:59.999+05:00`));

const entrySchema = z.object({
  type:        z.enum(["INCOME", "EXPENSE"]),
  category:    z.string().min(2).max(50),
  source:      z.string().max(150).optional(),
  amount:      z.number().positive().max(1_000_000_000),
  entryDate:   dateParam,
  description: z.string().min(3).max(300),
  reference:   z.string().max(100).optional(),
});

const rangeQuery = z.object({
  from: dateParam.optional(),
  to:   endOfDayParam.optional(),
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, svc.getCategories());
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = rangeQuery.parse(req.query);
  ApiRes.success(res, await svc.getSummary(from, to));
});

export const listEntries = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { from, to } = rangeQuery.parse(req.query);
  const type = z.enum(["INCOME", "EXPENSE"]).optional().parse(req.query.type);
  const { entries, total } = await svc.listEntries({
    page, limit, type, from, to,
    category: req.query.category as string | undefined,
    search:   req.query.search   as string | undefined,
    includeVoided: req.query.includeVoided === "true",
  });
  ApiRes.paginated(res, entries, buildPaginationMeta(total, page, limit));
});

export const createEntry = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = entrySchema.parse(req.body);
  ApiRes.created(res, await svc.createEntry(dto, req.user.userId), "Entry recorded");
});

export const voidEntry = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { reason } = z.object({ reason: z.string().min(5).max(300) }).parse(req.body);
  ApiRes.success(res, await svc.voidEntry(req.params.id, reason, req.user.userId), "Entry voided");
});
