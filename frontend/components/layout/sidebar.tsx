"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { getNav, type NavItem } from "@/config/nav";
import { getRoleHome } from "@/config/roles";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { setMobileNav, toggleSidebarCollapsed } from "@/store/slices/ui.slice";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "./logo";

function isActive(item: NavItem, pathname: string): boolean {
  if (item.isHome) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(item, pathname);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarContent({ collapsed, onNavigate, showToggle }: { collapsed: boolean; onNavigate?: () => void; showToggle?: boolean }) {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  if (!user) return null;

  const groups = getNav(user.role.name);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
        <Logo href={getRoleHome(user.role.name)} collapsed={collapsed} />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group, i) => (
          <div key={group.label ?? i} className="space-y-1">
            {group.label && !collapsed && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
            )}
            {group.label && collapsed && i > 0 && <div className="mx-3 border-t border-sidebar-border" />}
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {showToggle && (
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn("w-full text-sidebar-foreground", !collapsed && "justify-start")}
            onClick={() => dispatch(toggleSidebarCollapsed())}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 motion-reduce:transition-none lg:block",
        collapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} showToggle />
    </aside>
  );
}

export function MobileSidebar() {
  const open = useAppSelector((s) => s.ui.mobileNavOpen);
  const dispatch = useAppDispatch();
  return (
    <Sheet open={open} onOpenChange={(v) => dispatch(setMobileNav(v))}>
      <SheetContent side="left" className="bg-sidebar p-0 lg:hidden">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SheetDescription className="sr-only">Main navigation links</SheetDescription>
        <SidebarContent collapsed={false} onNavigate={() => dispatch(setMobileNav(false))} />
      </SheetContent>
    </Sheet>
  );
}
