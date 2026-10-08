"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { getRoleHome } from "@/config/roles";
import { useUnreadCount } from "@/features/notifications/hooks";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const user = useAppSelector(selectUser);
  const { data: count = 0 } = useUnreadCount();
  if (!user) return null;

  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href={`${getRoleHome(user.role.name)}/notifications`} aria-label={label}>
        <Bell aria-hidden="true" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
