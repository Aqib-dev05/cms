import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { RoleName } from "../../types/prisma.types";
import * as usersService from "./users.service";

const createStaffSchema = z.object({
  username:      z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  email:         z.string().email(),
  password:      z.string().min(8),
  roleName:      z.nativeEnum(RoleName),
  firstName:     z.string().min(1).max(50),
  lastName:      z.string().min(1).max(50),
  fatherName:    z.string().max(100).optional(),
  phone:         z.string().max(20).optional(),
  cnic:          z.string().regex(/^\d{5}-\d{7}-\d$/).optional(),
  address:       z.string().max(255).optional(),
  designation:   z.string().max(100).optional(),
  qualification: z.string().max(100).optional(),
  joiningDate:   z.string().transform((v) => new Date(v)),
  departmentId:  z.string().uuid().optional(),
  gender:        z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth:   z.string().transform((v) => new Date(v)).optional(),
});

const updateStaffSchema = z.object({
  firstName:     z.string().min(1).max(50).optional(),
  lastName:      z.string().min(1).max(50).optional(),
  fatherName:    z.string().max(100).optional(),
  phone:         z.string().max(20).optional(),
  address:       z.string().max(255).optional(),
  designation:   z.string().max(100).optional(),
  qualification: z.string().max(100).optional(),
  departmentId:  z.string().uuid().nullable().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

const listQuerySchema = z.object({
  page:     z.string().optional().default("1"),
  limit:    z.string().optional().default("20"),
  role:     z.nativeEnum(RoleName).optional(),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  search:   z.string().optional(),
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const { page, limit } = getPaginationParams({ page: query.page, limit: query.limit });
  const { users, total } = await usersService.getAllUsers({ page, limit, role: query.role, isActive: query.isActive, search: query.search });
  ApiRes.paginated(res, users, buildPaginationMeta(total, page, limit));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUserById(req.params.id);
  ApiRes.success(res, user);
});

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const dto = createStaffSchema.parse(req.body);
  const user = await usersService.createStaff(dto);
  ApiRes.created(res, user, "Staff created successfully");
});

export const updateStaffProfile = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateStaffSchema.parse(req.body);
  const profile = await usersService.updateStaffProfile(req.params.id, dto);
  ApiRes.success(res, profile, "Profile updated");
});

export const toggleStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.toggleUserStatus(req.params.id);
  ApiRes.success(res, user, `User ${user.isActive ? "activated" : "deactivated"}`);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = resetPasswordSchema.parse(req.body);
  await usersService.resetUserPassword(req.params.id, newPassword);
  ApiRes.success(res, null, "Password reset successfully");
});

export const getRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await usersService.getRoles();
  ApiRes.success(res, roles);
});
