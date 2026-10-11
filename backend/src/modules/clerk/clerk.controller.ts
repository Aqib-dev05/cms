import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./clerk.service";

const dutiesSchema = z.array(z.string()).max(20);

const createAssistantSchema = z.object({
  username:      z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/),
  email:         z.string().email(),
  password:      z.string().min(8),
  firstName:     z.string().min(1).max(50),
  lastName:      z.string().min(1).max(50),
  fatherName:    z.string().max(100).optional(),
  phone:         z.string().max(20).optional(),
  cnic:          z.string().regex(/^\d{5}-\d{7}-\d$/).optional(),
  address:       z.string().max(255).optional(),
  designation:   z.string().max(100).optional(),
  qualification: z.string().max(100).optional(),
  joiningDate:   z.string().transform((v) => new Date(v)).optional(),
  duties:        dutiesSchema,
});

const updateAssistantSchema = z.object({
  firstName:   z.string().min(1).max(50).optional(),
  lastName:    z.string().min(1).max(50).optional(),
  phone:       z.string().max(20).optional(),
  address:     z.string().max(255).optional(),
  designation: z.string().max(100).optional(),
});

function actor(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const getDuties = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, svc.getDutyCatalog());
});

export const listAssistants = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const isActive = req.query.isActive === undefined ? undefined : req.query.isActive === "true";
  const { assistants, total } = await svc.listAssistants(actor(req), {
    page, limit, isActive, search: req.query.search as string | undefined,
  });
  ApiRes.paginated(res, assistants, buildPaginationMeta(total, page, limit));
});

export const getAssistant = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getAssistant(actor(req), req.params.id));
});

export const createAssistant = asyncHandler(async (req: Request, res: Response) => {
  const dto = createAssistantSchema.parse(req.body);
  ApiRes.created(res, await svc.createAssistant(actor(req), dto), "Assistant created");
});

export const updateAssistant = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateAssistantSchema.parse(req.body);
  ApiRes.success(res, await svc.updateAssistant(actor(req), req.params.id, dto), "Assistant updated");
});

export const setDuties = asyncHandler(async (req: Request, res: Response) => {
  const { duties } = z.object({ duties: dutiesSchema }).parse(req.body);
  ApiRes.success(res, await svc.setAssistantDuties(actor(req), req.params.id, duties), "Duties updated");
});

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  ApiRes.success(res, await svc.setAssistantActive(actor(req), req.params.id, isActive), "Status updated");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);
  await svc.resetAssistantPassword(actor(req), req.params.id, newPassword);
  ApiRes.success(res, null, "Password reset");
});
