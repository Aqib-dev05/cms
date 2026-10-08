"use client";

import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { getRoleHome } from "@/config/roles";
import { useLogout } from "@/features/auth/hooks";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const user = useAppSelector(selectUser);
  const logout = useLogout();
  if (!user) return null;

  const home = getRoleHome(user.role.name);
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-medium">{user.username}</span>
          <span className="block text-xs text-muted-foreground">{user.role.displayName}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" aria-hidden="true" />
        <span className="sr-only">Open user menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <span className="block text-sm font-semibold text-foreground">{user.username}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          <span className="block text-xs text-muted-foreground">{user.role.displayName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`${home}/profile`}>
            <UserRound aria-hidden="true" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${home}/settings`}>
            <KeyRound aria-hidden="true" /> Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} className="text-destructive focus:text-destructive">
          <LogOut aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
