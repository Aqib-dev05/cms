"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ACCENTS, setAccent, type Accent } from "@/store/slices/ui.slice";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCENT_META: Record<Accent, { label: string; swatch: string }> = {
  emerald: { label: "Emerald", swatch: "bg-[hsl(142_72%_29%)]" },
  forest: { label: "Forest", swatch: "bg-[hsl(158_64%_22%)]" },
  mint: { label: "Mint", swatch: "bg-[hsl(168_84%_25%)]" },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const accent = useAppSelector((s) => s.ui.accent);
  const dispatch = useAppDispatch();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Sun className="dark:hidden" aria-hidden="true" />
          <Moon className="hidden dark:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden="true" /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden="true" /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden="true" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" aria-hidden="true" /> Accent colour
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={accent} onValueChange={(v) => dispatch(setAccent(v as Accent))}>
          {ACCENTS.map((a) => (
            <DropdownMenuRadioItem key={a} value={a}>
              <span className={cn("h-3.5 w-3.5 rounded-full ring-1 ring-border", ACCENT_META[a].swatch)} aria-hidden="true" />
              {ACCENT_META[a].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
