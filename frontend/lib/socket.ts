import { io, type Socket } from "socket.io-client";
import { store } from "@/store";

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

/** Mirrors SOCKET_EVENTS in backend/src/lib/socket.ts */
export const SOCKET_EVENTS = {
  NOTIFICATION: "notification",
  NOTIFICATION_UNREAD_COUNT: "notification:unread_count",
  ATTENDANCE_MARKED: "attendance:marked",
  ATTENDANCE_UPDATED: "attendance:updated",
  EXAM_RESULT_PUBLISHED: "exam:result_published",
  FINANCE_PAYMENT_RECEIVED: "finance:payment_received",
  FINANCE_INVOICE_CREATED: "finance:invoice_created",
  COMPLAINT_ASSIGNED: "complaint:assigned",
  COMPLAINT_STATUS_CHANGED: "complaint:status_changed",
  NOTICE_PUBLISHED: "notice:published",
  ADMISSION_STATUS_CHANGED: "admission:status_changed",
} as const;

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(SOCKET_URL, {
    withCredentials: true,
    // Function form → every (re)connect handshake uses the latest access token.
    auth: (cb) => cb({ token: store.getState().auth.accessToken }),
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
