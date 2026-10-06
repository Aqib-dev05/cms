import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./attendance.service";

const recordSchema = z.object({
  studentProfileId: z.string().uuid(),
  status:           z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks:          z.string().max(200).optional(),
});

const markSchema = z.object({
  sectionId: z.string().uuid(),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topic:     z.string().max(200).optional(),
  records:   z.array(recordSchema).min(1),
});

const updateRecordSchema = z.object({
  status:  z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().max(200).optional(),
});

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = markSchema.parse(req.body);
  const data = await svc.markAttendance(dto, req.user.userId);
  ApiRes.created(res, data, "Attendance marked successfully");
});

export const updateRecord = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateRecordSchema.parse(req.body);
  const data = await svc.updateAttendanceRecord(req.params.recordId, dto);
  ApiRes.success(res, data, "Attendance record updated");
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSessionById(req.params.id);
  ApiRes.success(res, data);
});

export const getSectionSessions = asyncHandler(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to   = req.query.to   ? new Date(req.query.to as string)   : undefined;
  const data = await svc.getSectionAttendanceSessions(req.params.sectionId, { from, to });
  ApiRes.success(res, data);
});

export const getSectionSummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSectionAttendanceSummary(req.params.sectionId);
  ApiRes.success(res, data);
});

export const getMyAttendance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const data = await svc.getStudentAttendanceReport({
    userId:    req.user.userId,
    sectionId: req.query.sectionId as string | undefined,
    from:      req.query.from ? new Date(req.query.from as string) : undefined,
    to:        req.query.to   ? new Date(req.query.to as string)   : undefined,
  });
  ApiRes.success(res, data);
});

export const getStudentAttendance = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getStudentAttendanceReport({
    userId:    req.params.userId,
    sectionId: req.query.sectionId as string | undefined,
    from:      req.query.from ? new Date(req.query.from as string) : undefined,
    to:        req.query.to   ? new Date(req.query.to as string)   : undefined,
  });
  ApiRes.success(res, data);
});
