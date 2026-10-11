"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { refreshAccessToken } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { SOCKET_EVENTS, connectSocket, disconnectSocket } from "@/lib/socket";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated } from "@/store/slices/auth.slice";

interface NotificationPayload {
  title?: string;
  body?: string;
}

/** Keeps one authenticated socket open while logged in and bridges events → React Query / toasts. */
export function SocketProvider() {
  const authed = useAppSelector(selectIsAuthenticated);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authed) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();
    let refreshedOnce = false;

    const onConnect = () => {
      refreshedOnce = false;
    };

    // Access token expired between page load and handshake → refresh once, then reconnect.
    const onConnectError = async (err: Error) => {
      if (refreshedOnce || !/token|unauthor/i.test(err.message)) return;
      refreshedOnce = true;
      try {
        await refreshAccessToken();
        socket.connect();
      } catch {
        /* session is gone; the axios interceptor handles logout */
      }
    };

    const onNotification = (payload: NotificationPayload) => {
      toast(payload.title ?? "New notification", { description: payload.body });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    const onUnreadCount = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    };

    // Data-change events → just refresh the affected lists (the backend already scopes who receives them).
    const refetchers: Array<[string, readonly unknown[]]> = [
      [SOCKET_EVENTS.FINANCE_INVOICE_CREATED, queryKeys.finance.all],
      [SOCKET_EVENTS.FINANCE_PAYMENT_RECEIVED, queryKeys.finance.all],
      [SOCKET_EVENTS.COMPLAINT_ASSIGNED, queryKeys.complaints.all],
      [SOCKET_EVENTS.COMPLAINT_STATUS_CHANGED, queryKeys.complaints.all],
      [SOCKET_EVENTS.NOTICE_PUBLISHED, queryKeys.notices.all],
      [SOCKET_EVENTS.ADMISSION_STATUS_CHANGED, queryKeys.admissions.all],
    ];
    const handlers = refetchers.map(([event, queryKey]) => {
      const handler = () => {
        queryClient.invalidateQueries({ queryKey });
      };
      socket.on(event, handler);
      return [event, handler] as const;
    });

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on(SOCKET_EVENTS.NOTIFICATION, onNotification);
    socket.on(SOCKET_EVENTS.NOTIFICATION_UNREAD_COUNT, onUnreadCount);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off(SOCKET_EVENTS.NOTIFICATION, onNotification);
      socket.off(SOCKET_EVENTS.NOTIFICATION_UNREAD_COUNT, onUnreadCount);
      for (const [event, handler] of handlers) socket.off(event, handler);
    };
  }, [authed, queryClient]);

  return null;
}
