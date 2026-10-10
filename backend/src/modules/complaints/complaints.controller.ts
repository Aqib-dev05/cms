import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./complaints.service";

const createSchema = z.object({
  title:       z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  categoryId:  z.string().uuid(),
});

const assignSchema = z.object({
  assignedToId: z.string().uuid(),
  note:         z.string().max(300).optional(),
});

const statusSchema = z.object({
  status: z.enum(["UNDER_REVIEW","IN_PROGRESS","RESOLVED","CLOSED","REJECTED"]),
  note:   z.string().max(300).optional(),
});

const commentSchema = z.object({
  content:    z.string().min(1).max(1000),
  isInternal: z.boolean().default(false),
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getCategories());
});

export const getComplaints = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);

  // Students can only see their own complaints
  const isStudent = req.user.roleName === "STUDENT";
  const createdById = isStudent ? req.user.userId : (req.query.createdById as string | undefined);

  const { complaints, total } = await svc.getComplaints({
    page, limit, createdById,
    status:     req.query.status     as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
  });
  ApiRes.paginated(res, complaints, buildPaginationMeta(total, page, limit));
});

export const getComplaint = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const data = await svc.getComplaintById(req.params.id, req.user);
  ApiRes.success(res, data);
});

export const createComplaint = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = createSchema.parse(req.body);
  ApiRes.created(res, await svc.createComplaint(dto, req.user.userId), "Complaint submitted");
});

export const assignComplaint = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = assignSchema.parse(req.body);
  ApiRes.success(res, await svc.assignComplaint(req.params.id, dto, req.user.userId), "Complaint assigned");
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = statusSchema.parse(req.body);
  ApiRes.success(res, await svc.updateComplaintStatus(req.params.id, dto, req.user.userId), "Status updated");
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = commentSchema.parse(req.body);
  ApiRes.created(res, await svc.addComment(req.params.id, dto, req.user), "Comment added");
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getComplaintStats());
});
