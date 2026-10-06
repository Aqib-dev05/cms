import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./notices.service";

const audienceEnum = z.enum(["ALL","STUDENTS","STAFF","DEPARTMENT","PROGRAM"]);

const createSchema = z.object({
  title:        z.string().min(3).max(200),
  content:      z.string().min(10),
  category:     z.string().max(50).optional(),
  audience:     audienceEnum,
  departmentId: z.string().uuid().optional(),
  programId:    z.string().uuid().optional(),
  expiresAt:    z.string().transform((v) => new Date(v)).optional(),
  publishNow:   z.boolean().optional(),
});

export const getNotices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { notices, total } = await svc.getNotices({
    page, limit,
    audience: req.query.audience as string | undefined,
    category: req.query.category as string | undefined,
    active:   req.query.active === "true",
  });
  ApiRes.paginated(res, notices, buildPaginationMeta(total, page, limit));
});

export const getNotice = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getNoticeById(req.params.id));
});

export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = createSchema.parse(req.body);
  ApiRes.created(res, await svc.createNotice(dto, req.user.userId), "Notice created");
});

export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  const dto = createSchema.omit({ publishNow: true }).partial().parse(req.body);
  ApiRes.success(res, await svc.updateNotice(req.params.id, dto), "Notice updated");
});

export const publishNotice = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.publishNotice(req.params.id), "Notice published");
});

export const deleteNotice = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteNotice(req.params.id);
  ApiRes.success(res, null, "Notice deleted");
});
