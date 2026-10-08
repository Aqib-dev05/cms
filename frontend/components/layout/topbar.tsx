"use client";

import { Menu } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { setMobileNav } from "@/store/slices/ui.slice";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./breadcrumbs";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar() {
  const dispatch = useAppDispatch();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => dispatch(setMobileNav(true))} aria-label="Open navigation menu">
        <Menu aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
