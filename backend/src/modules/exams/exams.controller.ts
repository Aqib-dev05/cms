import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./exams.service";

const examTypeEnum = z.enum(["MIDTERM","FINAL","QUIZ","ASSIGNMENT","LAB","PROJECT","SESSIONAL"]);

const createExamSchema = z.object({
  title:        z.string().min(2).max(100),
  type:         examTypeEnum,
  sectionId:    z.string().uuid(),
  totalMarks:   z.number().positive(),
  passingMarks: z.number().positive(),
  date:         z.string().transform((v) => new Date(v)).optional(),
  duration:     z.number().int().positive().optional(),
  instructions: z.string().max(1000).optional(),
});

const updateExamSchema = createExamSchema.omit({ sectionId: true }).partial();

const resultSchema = z.object({
  studentProfileId: z.string().uuid(),
  marksObtained:    z.number().min(0),
  isAbsent:         z.boolean().optional(),
  remarks:          z.string().max(200).optional(),
});

const bulkResultSchema = z.object({
  results: z.array(resultSchema).min(1),
});

export const getExams = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getExams({
    sectionId:  req.query.sectionId  as string | undefined,
    semesterId: req.query.semesterId as string | undefined,
    type:       req.query.type       as string | undefined,
  });
  ApiRes.success(res, data);
});

export const getExam = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getExamById(req.params.id);
  ApiRes.success(res, data);
});

export const createExam = asyncHandler(async (req: Request, res: Response) => {
  const dto = createExamSchema.parse(req.body);
  const data = await svc.createExam(dto);
  ApiRes.created(res, data, "Exam created");
});

export const updateExam = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateExamSchema.parse(req.body);
  const data = await svc.updateExam(req.params.id, dto);
  ApiRes.success(res, data, "Exam updated");
});

export const deleteExam = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteExam(req.params.id);
  ApiRes.success(res, null, "Exam deleted");
});

export const publishExam = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.publishExam(req.params.id);
  ApiRes.success(res, data, "Exam published");
});

export const unpublishExam = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.unpublishExam(req.params.id);
  ApiRes.success(res, data, "Exam unpublished");
});

export const enterResult = asyncHandler(async (req: Request, res: Response) => {
  const dto = resultSchema.parse(req.body);
  const data = await svc.enterResult(req.params.id, dto);
  ApiRes.success(res, data, "Result saved");
});

export const bulkEnterResults = asyncHandler(async (req: Request, res: Response) => {
  const dto = bulkResultSchema.parse(req.body);
  const data = await svc.bulkEnterResults(req.params.id, dto);
  ApiRes.success(res, data, `${data.count} results saved`);
});

export const publishResults = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.publishResults(req.params.id);
  ApiRes.success(res, data, "Results published");
});

export const getSectionSummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSectionResultSummary(req.params.id);
  ApiRes.success(res, data);
});

export const getMyGrades = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const data = await svc.getStudentGradeReport(
    req.user.userId,
    req.query.semesterId as string | undefined
  );
  ApiRes.success(res, data);
});

export const getStudentGrades = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getStudentGradeReport(
    req.params.userId,
    req.query.semesterId as string | undefined
  );
  ApiRes.success(res, data);
});
