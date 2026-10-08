import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./students.service";

const createStudentSchema = z.object({
  username:      z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  email:         z.string().email(),
  password:      z.string().min(8),
  firstName:     z.string().min(1).max(50),
  lastName:      z.string().min(1).max(50),
  fatherName:    z.string().max(100).optional(),
  gender:        z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth:   z.string().transform((v) => new Date(v)).optional(),
  cnic:          z.string().regex(/^\d{5}-\d{7}-\d$/).optional(),
  phone:         z.string().max(20).optional(),
  personalEmail: z.string().email().optional(),
  address:       z.string().max(255).optional(),
  programId:     z.string().uuid(),
  enrollmentDate: z.string().transform((v) => new Date(v)),
});

const updateProfileSchema = z.object({
  firstName:       z.string().min(1).max(50).optional(),
  lastName:        z.string().min(1).max(50).optional(),
  fatherName:      z.string().max(100).optional(),
  phone:           z.string().max(20).optional(),
  address:         z.string().max(255).optional(),
  personalEmail:   z.string().email().optional(),
  currentSemester: z.number().int().min(1).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "EXPELLED", "ON_LEAVE", "DROPPED_OUT", "GRADUATED"]),
  note:   z.string().optional(),
});

const enrollSchema = z.object({
  sectionId: z.string().uuid(),
});

const listQuerySchema = z.object({
  page:      z.string().default("1"),
  limit:     z.string().default("20"),
  programId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  status:    z.enum(svc.STUDENT_STATUSES).optional(),
  search:    z.string().optional(),
});

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const { page, limit } = getPaginationParams({ page: query.page, limit: query.limit });
  const { students, total } = await svc.getStudents({
    page, limit,
    programId:  query.programId,
    semesterId: query.semesterId,
    status:     query.status,
    search:     query.search,
  });
  ApiRes.paginated(res, students, buildPaginationMeta(total, page, limit));
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getStudentById(req.params.id);
  ApiRes.success(res, data);
});

export const getStudentByRegNo = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getStudentByRegNo(req.params.regNo);
  ApiRes.success(res, data);
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const data = await svc.getStudentById(req.user.userId);
  ApiRes.success(res, data);
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const dto = createStudentSchema.parse(req.body);
  const data = await svc.createStudent(dto);
  ApiRes.created(res, data, "Student created successfully");
});

export const updateStudentProfile = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateProfileSchema.parse(req.body);
  const data = await svc.updateStudentProfile(req.params.id, dto);
  ApiRes.success(res, data, "Profile updated");
});

export const updateStudentStatus = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateStatusSchema.parse(req.body);
  const data = await svc.updateStudentStatus(req.params.id, dto);
  ApiRes.success(res, data, `Student status updated to ${dto.status}`);
});

export const enrollStudent = asyncHandler(async (req: Request, res: Response) => {
  const dto = enrollSchema.parse(req.body);
  const data = await svc.enrollStudent(req.params.id, dto);
  ApiRes.created(res, data, "Student enrolled successfully");
});

export const unenrollStudent = asyncHandler(async (req: Request, res: Response) => {
  await svc.unenrollStudent(req.params.id, req.params.sectionId);
  ApiRes.success(res, null, "Student unenrolled");
});

export const getStudentEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getStudentEnrollments(req.params.id);
  ApiRes.success(res, data);
});
