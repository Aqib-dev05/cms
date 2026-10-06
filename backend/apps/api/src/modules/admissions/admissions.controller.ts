import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./admissions.service";

const submitSchema = z.object({
  programId:   z.string().uuid(),
  firstName:   z.string().min(1).max(50),
  lastName:    z.string().min(1).max(50),
  fatherName:  z.string().max(100).optional(),
  email:       z.string().email(),
  phone:       z.string().max(20).optional(),
  cnic:        z.string().regex(/^\d{5}-\d{7}-\d$/).optional(),
  gender:      z.enum(["MALE","FEMALE","OTHER"]).optional(),
  dateOfBirth: z.string().transform((v) => new Date(v)).optional(),
  address:     z.string().max(255).optional(),
});

const reviewSchema = z.object({
  status:  z.enum(["SHORTLISTED","APPROVED","REJECTED","WAITLISTED"]),
  remarks: z.string().max(500).optional(),
});

export const getApplications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { applications, total } = await svc.getApplications({
    page, limit,
    status:    req.query.status    as string | undefined,
    programId: req.query.programId as string | undefined,
    search:    req.query.search    as string | undefined,
  });
  ApiRes.paginated(res, applications, buildPaginationMeta(total, page, limit));
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getApplicationById(req.params.id));
});

export const submitApplication = asyncHandler(async (req: Request, res: Response) => {
  const dto = submitSchema.parse(req.body);
  ApiRes.created(res, await svc.submitApplication(dto), "Application submitted successfully");
});

export const reviewApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = reviewSchema.parse(req.body);
  ApiRes.success(res, await svc.reviewApplication(req.params.id, dto, req.user.userId), "Application reviewed");
});

export const enrollApplicant = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const data = await svc.approveAndEnroll(req.params.id, req.user.userId);
  ApiRes.created(res, data, "Student enrolled and account created");
});
