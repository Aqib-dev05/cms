"use client";

import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "../types";

const OPTIONS: { value: AttendanceStatus; short: string; label: string; active: string }[] = [
  { value: "PRESENT", short: "P", label: "Present", active: "bg-success text-success-foreground border-success" },
  { value: "ABSENT", short: "A", label: "Absent", active: "bg-destructive text-destructive-foreground border-destructive" },
  { value: "LATE", short: "L", label: "Late", active: "bg-warning text-warning-foreground border-warning" },
  { value: "EXCUSED", short: "E", label: "Excused", active: "bg-info text-info-foreground border-info" },
];

interface StatusToggleProps {
  value: AttendanceStatus;
  onChange: (v: AttendanceStatus) => void;
  /** accessible name of the group, e.g. the student's name */
  label: string;
  disabled?: boolean;
}

/** Four-way radio group (P / A / L / E). Letters + colour + full label for assistive tech. */
export function StatusToggle({ value, onChange, label, disabled }: StatusToggleProps) {
  return (
    <div role="radiogroup" aria-label={`Attendance for ${label}`} className="inline-flex gap-1">
      {OPTIONS.map((o) => {
        const checked = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o.label}
            title={o.label}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 w-9 rounded-md border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11",
              checked ? o.active : "bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
}
