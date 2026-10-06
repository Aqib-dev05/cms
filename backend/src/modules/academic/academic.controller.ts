import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes } from "../../utils/response";
import * as svc from "./academic.service";

// ─── Schemas ──────────────────────────────────────────────────

const departmentSchema = z.object({
  name:        z.string().min(2).max(100),
  code:        z.string().min(2).max(10),
  description: z.string().max(500).optional(),
});

const updateDeptSchema = departmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const assignHodSchema = z.object({
  hodId: z.string().uuid(),
});

const programSchema = z.object({
  name:           z.string().min(2).max(100),
  code:           z.string().min(2).max(10),
  departmentId:   z.string().uuid(),
  description:    z.string().max(500).optional(),
  durationYears:  z.number().int().min(1).max(6).optional(),
  totalSemesters: z.number().int().min(1).max(12).optional(),
});

const updateProgramSchema = programSchema.omit({ departmentId: true }).partial().extend({
  isActive: z.boolean().optional(),
});

const sessionSchema = z.object({
  name:      z.string().min(2).max(50),
  programId: z.string().uuid(),
  startDate: z.string().transform((v) => new Date(v)),
  endDate:   z.string().transform((v) => new Date(v)),
});

const updateSessionSchema = z.object({
  name:      z.string().min(2).max(50).optional(),
  startDate: z.string().transform((v) => new Date(v)).optional(),
  endDate:   z.string().transform((v) => new Date(v)).optional(),
  isActive:  z.boolean().optional(),
});

const semesterSchema = z.object({
  semesterNumber:    z.number().int().min(1).max(12),
  type:              z.enum(["FALL", "SPRING", "SUMMER"]),
  academicSessionId: z.string().uuid(),
  startDate:         z.string().transform((v) => new Date(v)),
  endDate:           z.string().transform((v) => new Date(v)),
});

const updateSemesterSchema = z.object({
  semesterNumber: z.number().int().min(1).max(12).optional(),
  type:           z.enum(["FALL", "SPRING", "SUMMER"]).optional(),
  startDate:      z.string().transform((v) => new Date(v)).optional(),
  endDate:        z.string().transform((v) => new Date(v)).optional(),
  isActive:       z.boolean().optional(),
});

const courseSchema = z.object({
  name:         z.string().min(2).max(100),
  code:         z.string().min(2).max(15),
  departmentId: z.string().uuid(),
  creditHours:  z.number().int().min(1).max(6).optional(),
  description:  z.string().max(500).optional(),
  isElective:   z.boolean().optional(),
});

const updateCourseSchema = courseSchema.omit({ departmentId: true }).partial().extend({
  isActive: z.boolean().optional(),
});

const assignCourseSchema = z.object({
  semesterId: z.string().uuid(),
});

const sectionSchema = z.object({
  name:      z.string().min(1).max(10),
  courseId:  z.string().uuid(),
  semesterId: z.string().uuid(),
  capacity:  z.number().int().min(1).max(200).optional(),
});

const updateSectionSchema = z.object({
  name:     z.string().min(1).max(10).optional(),
  capacity: z.number().int().min(1).max(200).optional(),
});

const assignTeacherSchema = z.object({
  staffProfileId: z.string().uuid(),
  isPrimary:      z.boolean().optional(),
});

// ─── Department Controllers ───────────────────────────────────

export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === "true";
  const data = await svc.getDepartments(includeInactive);
  ApiRes.success(res, data);
});

export const getDepartment = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getDepartmentById(req.params.id);
  ApiRes.success(res, data);
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dto = departmentSchema.parse(req.body);
  const data = await svc.createDepartment(dto);
  ApiRes.created(res, data, "Department created");
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateDeptSchema.parse(req.body);
  const data = await svc.updateDepartment(req.params.id, dto);
  ApiRes.success(res, data, "Department updated");
});

export const assignHod = asyncHandler(async (req: Request, res: Response) => {
  const dto = assignHodSchema.parse(req.body);
  const data = await svc.assignHod(req.params.id, dto);
  ApiRes.success(res, data, "HOD assigned successfully");
});

// ─── Program Controllers ──────────────────────────────────────

export const getPrograms = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = req.query.departmentId as string | undefined;
  const includeInactive = req.query.includeInactive === "true";
  const data = await svc.getPrograms(departmentId, includeInactive);
  ApiRes.success(res, data);
});

export const getProgram = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getProgramById(req.params.id);
  ApiRes.success(res, data);
});

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  const dto = programSchema.parse(req.body);
  const data = await svc.createProgram(dto);
  ApiRes.created(res, data, "Program created");
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateProgramSchema.parse(req.body);
  const data = await svc.updateProgram(req.params.id, dto);
  ApiRes.success(res, data, "Program updated");
});

// ─── Session Controllers ──────────────────────────────────────

export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const programId = req.params.programId;
  const data = await svc.getSessions(programId);
  ApiRes.success(res, data);
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSessionById(req.params.id);
  ApiRes.success(res, data);
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const dto = sessionSchema.parse(req.body);
  const data = await svc.createSession(dto);
  ApiRes.created(res, data, "Academic session created");
});

export const updateSession = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateSessionSchema.parse(req.body);
  const data = await svc.updateSession(req.params.id, dto);
  ApiRes.success(res, data, "Session updated");
});

// ─── Semester Controllers ─────────────────────────────────────

export const getSemesters = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSemesters(req.params.sessionId);
  ApiRes.success(res, data);
});

export const getSemester = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSemesterById(req.params.id);
  ApiRes.success(res, data);
});

export const createSemester = asyncHandler(async (req: Request, res: Response) => {
  const dto = semesterSchema.parse(req.body);
  const data = await svc.createSemester(dto);
  ApiRes.created(res, data, "Semester created");
});

export const updateSemester = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateSemesterSchema.parse(req.body);
  const data = await svc.updateSemester(req.params.id, dto);
  ApiRes.success(res, data, "Semester updated");
});

// ─── Course Controllers ───────────────────────────────────────

export const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getCourses({
    departmentId:    req.query.departmentId as string | undefined,
    semesterId:      req.query.semesterId as string | undefined,
    includeInactive: req.query.includeInactive === "true",
    search:          req.query.search as string | undefined,
  });
  ApiRes.success(res, data);
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getCourseById(req.params.id);
  ApiRes.success(res, data);
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const dto = courseSchema.parse(req.body);
  const data = await svc.createCourse(dto);
  ApiRes.created(res, data, "Course created");
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateCourseSchema.parse(req.body);
  const data = await svc.updateCourse(req.params.id, dto);
  ApiRes.success(res, data, "Course updated");
});

export const assignCourseToSemester = asyncHandler(async (req: Request, res: Response) => {
  const { semesterId } = assignCourseSchema.parse(req.body);
  const data = await svc.assignCourseToSemester({ courseId: req.params.id, semesterId });
  ApiRes.success(res, data, "Course assigned to semester");
});

export const removeCourseFromSemester = asyncHandler(async (req: Request, res: Response) => {
  await svc.removeCourseFromSemester(req.params.id, req.params.semesterId);
  ApiRes.success(res, null, "Course removed from semester");
});

// ─── Section Controllers ──────────────────────────────────────

export const getSections = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSections({
    semesterId: req.query.semesterId as string | undefined,
    courseId:   req.query.courseId as string | undefined,
    teacherId:  req.query.teacherId as string | undefined,
  });
  ApiRes.success(res, data);
});

export const getSection = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSectionById(req.params.id);
  ApiRes.success(res, data);
});

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const dto = sectionSchema.parse(req.body);
  const data = await svc.createSection(dto);
  ApiRes.created(res, data, "Section created");
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateSectionSchema.parse(req.body);
  const data = await svc.updateSection(req.params.id, dto);
  ApiRes.success(res, data, "Section updated");
});

export const assignTeacher = asyncHandler(async (req: Request, res: Response) => {
  const dto = assignTeacherSchema.parse(req.body);
  const data = await svc.assignTeacher(req.params.id, dto);
  ApiRes.success(res, data, "Teacher assigned to section");
});

export const removeTeacher = asyncHandler(async (req: Request, res: Response) => {
  await svc.removeTeacher(req.params.id, req.params.staffProfileId);
  ApiRes.success(res, null, "Teacher removed from section");
});
