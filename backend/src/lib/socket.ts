import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import type { JwtPayload } from "../middlewares/auth.middleware";

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin:      env.CORS_ORIGIN,
      credentials: true,
      methods:     ["GET", "POST"],
    },
    pingTimeout:  30000,
    pingInterval: 10000,
  });

  // JWT auth middleware
  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization ?? "").replace("Bearer ", "");

    if (!token) { next(new Error("Authentication token required")); return; }

    try {
      const payload  = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info(`Socket connected: ${user.userId} (${user.roleName})`);

    // Personal room + role room
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.roleName}`);

    socket.on("join:section", (sectionId: string) => {
      socket.join(`section:${sectionId}`);
    });

    socket.on("leave:section", (sectionId: string) => {
      socket.leave(`section:${sectionId}`);
    });

    socket.on("disconnect", (reason: string) => {
      logger.info(`Socket disconnected: ${user.userId} — ${reason}`);
    });
  });

  logger.info("✅ Socket.io initialised");
  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  getIO().to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(roleName: string, event: string, payload: unknown) {
  getIO().to(`role:${roleName}`).emit(event, payload);
}

export function emitToAll(event: string, payload: unknown) {
  getIO().emit(event, payload);
}

export function emitToSection(sectionId: string, event: string, payload: unknown) {
  getIO().to(`section:${sectionId}`).emit(event, payload);
}

export const SOCKET_EVENTS = {
  NOTIFICATION:       "notification",
  UNREAD_COUNT:       "notification:unread_count",
  ATTENDANCE_MARKED:  "attendance:marked",
  ATTENDANCE_UPDATED: "attendance:updated",
  RESULT_PUBLISHED:   "exam:result_published",
  PAYMENT_RECEIVED:   "finance:payment_received",
  INVOICE_CREATED:    "finance:invoice_created",
  COMPLAINT_ASSIGNED: "complaint:assigned",
  COMPLAINT_STATUS:   "complaint:status_changed",
  NOTICE_PUBLISHED:   "notice:published",
  APPLICATION_STATUS: "admission:status_changed",
} as const;
