import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./staff.service";

const updateStatusSchema = z.object({
  status:      z.enum(["ACTIVE","ON_LEAVE","SUSPENDED","RESIGNED","RETIRED"]),
  leavingDate: z.string().transform((v) => new Date(v)).optional(),
  note:        z.string().max(300).optional(),
});

const leaveSchema = z.object({
  type:     z.enum(["SICK","CASUAL","ANNUAL","MATERNITY","PATERNITY","UNPAID"]),
  fromDate: z.string().transform((v) => new Date(v)),
  toDate:   z.string().transform((v) => new Date(v)),
  reason:   z.string().min(10).max(500),
});

export const getAllStaff = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { staff, total } = await svc.getAllStaff({
    page, limit,
    departmentId: req.query.departmentId as string | undefined,
    role:         req.query.role         as string | undefined,
    status:       req.query.status       as string | undefined,
    search:       req.query.search       as string | undefined,
  });
  ApiRes.paginated(res, staff, buildPaginationMeta(total, page, limit));
});

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getStaffById(req.params.id));
});

export const getDepartmentStaff = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getDepartmentStaff(req.params.departmentId));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateStatusSchema.parse(req.body);
  ApiRes.success(res, await svc.updateStaffStatus(req.params.id, dto), "Staff status updated");
});

export const requestLeave = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = leaveSchema.parse(req.body);
  ApiRes.created(res, await svc.createLeaveRequest(req.user.userId, dto), "Leave request submitted");
});

export const getWorkload = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getStaffWorkload(req.params.id));
});

export const getMyWorkload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.success(res, await svc.getStaffWorkload(req.user.userId));
});
