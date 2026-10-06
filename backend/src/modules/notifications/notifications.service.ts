import { prisma } from "../../config/database";
import { emitToUser, SOCKET_EVENTS } from "../../lib/socket";
import { AppError } from "../../utils/app-error";

export interface SendNotificationDto {
  title:       string;
  body:        string;
  channel?:    "IN_APP" | "EMAIL" | "SMS";
  data?:       Record<string, unknown>;
  recipientIds: string[];
}

export async function sendNotification(dto: SendNotificationDto) {
  if (dto.recipientIds.length === 0) throw AppError.badRequest("At least one recipient required");

  const notification = await prisma.notification.create({
    data: {
      title:   dto.title,
      body:    dto.body,
      channel: dto.channel ?? "IN_APP",
      data:    dto.data ?? {},
      recipients: {
        create: dto.recipientIds.map((userId) => ({ userId })),
      },
    },
    include: { _count: { select: { recipients: true } } },
  });

  // Push real-time event to every online recipient
  for (const userId of dto.recipientIds) {
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, {
      title:   dto.title,
      body:    dto.body,
      channel: dto.channel ?? "IN_APP",
      data:    dto.data,
    });
  }

  return notification;
}

export async function sendToRole(
  dto: Omit<SendNotificationDto, "recipientIds">,
  roleName: string
) {
  const users = await prisma.user.findMany({
    where: { role: { name: roleName }, isActive: true },
    select: { id: true },
  });
  if (users.length === 0) return null;
  return sendNotification({ ...dto, recipientIds: users.map((u: { id: string }) => u.id) });
}

export async function sendToAll(dto: Omit<SendNotificationDto, "recipientIds">) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  return sendNotification({ ...dto, recipientIds: users.map((u: { id: string }) => u.id) });
}

export async function getUserNotifications(userId: string, params: {
  page:    number;
  limit:   number;
  unread?: boolean;
}) {
  const { page, limit, unread } = params;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(unread && { isRead: false }),
  };

  const [recipients, total] = await Promise.all([
    prisma.notificationRecipient.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: "desc" },
      include: { notification: true },
    }),
    prisma.notificationRecipient.count({ where }),
  ]);

  return { notifications: recipients, total };
}

export async function markAsRead(userId: string, notificationId: string) {
  const record = await prisma.notificationRecipient.findUnique({
    where: { notificationId_userId: { notificationId, userId } },
  });
  if (!record) throw AppError.notFound("Notification not found");
  if (record.userId !== userId) throw AppError.forbidden();

  return prisma.notificationRecipient.update({
    where: { notificationId_userId: { notificationId, userId } },
    data:  { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notificationRecipient.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notificationRecipient.count({
    where: { userId, isRead: false },
  });
  return { unreadCount: count };
}
