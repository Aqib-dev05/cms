import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./timetable.service";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const createSlotSchema = z.object({
  sectionId: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(6),
  startTime: z.string().regex(timeRegex, "Format: HH:MM"),
  endTime:   z.string().regex(timeRegex, "Format: HH:MM"),
  room:      z.string().max(50).optional(),
});

const updateSlotSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(6).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime:   z.string().regex(timeRegex).optional(),
  room:      z.string().max(50).optional(),
});

export const getSectionTimetable = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getSectionTimetable(req.params.sectionId);
  ApiRes.success(res, data);
});

export const getTeacherTimetable = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getTeacherTimetable(req.params.staffProfileId);
  ApiRes.success(res, data);
});

export const getMyTimetable = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const data = await svc.getStudentTimetable(req.user.userId);
  ApiRes.success(res, data);
});

export const createSlot = asyncHandler(async (req: Request, res: Response) => {
  const dto = createSlotSchema.parse(req.body);
  const data = await svc.createSlot(dto);
  ApiRes.created(res, data, "Timetable slot created");
});

export const updateSlot = asyncHandler(async (req: Request, res: Response) => {
  const dto = updateSlotSchema.parse(req.body);
  const data = await svc.updateSlot(req.params.id, dto);
  ApiRes.success(res, data, "Slot updated");
});

export const deleteSlot = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteSlot(req.params.id);
  ApiRes.success(res, null, "Slot deleted");
});
