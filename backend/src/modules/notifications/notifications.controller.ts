import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./notifications.service";

const sendSchema = z.object({
  title:        z.string().min(1).max(200),
  body:         z.string().min(1).max(1000),
  channel:      z.enum(["IN_APP","EMAIL","SMS"]).optional(),
  data:         z.record(z.unknown()).optional(),
  recipientIds: z.array(z.string().uuid()).min(1),
});

const sendToRoleSchema = z.object({
  title:    z.string().min(1).max(200),
  body:     z.string().min(1).max(1000),
  roleName: z.enum(["ADMIN", "HOD", "TEACHER", "HEAD_CLERK", "CLERK", "COMPLAINT_OFFICER", "LIBRARIAN", "STUDENT"]),
  channel:  z.enum(["IN_APP","EMAIL","SMS"]).optional(),
});

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { notifications, total } = await svc.getUserNotifications(req.user.userId, {
    page, limit, unread: req.query.unread === "true",
  });
  ApiRes.paginated(res, notifications, buildPaginationMeta(total, page, limit));
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.success(res, await svc.getUnreadCount(req.user.userId));
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.success(res, await svc.markAsRead(req.user.userId, req.params.id), "Marked as read");
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.success(res, await svc.markAllAsRead(req.user.userId), "All notifications marked as read");
});

export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const dto = sendSchema.parse(req.body);
  ApiRes.created(res, await svc.sendNotification(dto), "Notification sent");
});

export const sendToRole = asyncHandler(async (req: Request, res: Response) => {
  const dto = sendToRoleSchema.parse(req.body);
  ApiRes.success(res, await svc.sendToRole(dto, dto.roleName), "Notification sent to role");
});

export const broadcastToAll = asyncHandler(async (req: Request, res: Response) => {
  const dto = z.object({ title: z.string(), body: z.string() }).parse(req.body);
  ApiRes.success(res, await svc.sendToAll(dto), "Broadcast sent");
});
