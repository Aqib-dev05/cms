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

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on(SOCKET_EVENTS.NOTIFICATION, onNotification);
    socket.on(SOCKET_EVENTS.NOTIFICATION_UNREAD_COUNT, onUnreadCount);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off(SOCKET_EVENTS.NOTIFICATION, onNotification);
      socket.off(SOCKET_EVENTS.NOTIFICATION_UNREAD_COUNT, onUnreadCount);
    };
  }, [authed, queryClient]);

  return null;
}
