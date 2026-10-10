"use client";

import { useEffect } from "react";
import { usePrograms, useSemesters, useSessions } from "@/features/academic/hooks";
import { humanize } from "@/lib/format";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SemesterPickerValue {
  programId: string;
  sessionId: string;
  semesterId: string;
}
interface SemesterPickerProps {
  value: SemesterPickerValue;
  onChange: (value: SemesterPickerValue) => void;
  className?: string;
  /** hide labels (for toolbars) */
  compact?: boolean;
}

/** Program → Session → Semester cascade. Auto-selects the active session / semester when there is one. */
export function SemesterPicker({ value, onChange, className, compact }: SemesterPickerProps) {
  const programs = usePrograms();
  const sessions = useSessions(value.programId);
  const semesters = useSemesters(value.sessionId);

  // pick the active session once sessions load
  useEffect(() => {
    if (!value.programId || value.sessionId || !sessions.data?.length) return;
    const pick = sessions.data.find((s) => s.isActive) ?? sessions.data[0];
    onChange({ ...value, sessionId: pick.id, semesterId: "" });
  }, [sessions.data, value, onChange]);

  // pick the active semester once semesters load
  useEffect(() => {
    if (!value.sessionId || value.semesterId || !semesters.data?.length) return;
    const pick = semesters.data.find((s) => s.isActive) ?? semesters.data[0];
    onChange({ ...value, semesterId: pick.id });
  }, [semesters.data, value, onChange]);

  const labelClass = compact ? "sr-only" : undefined;
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      <div className="space-y-2">
        <Label htmlFor="sp-program" className={labelClass}>
          Program
        </Label>
        <Select id="sp-program" value={value.programId} onChange={(e) => onChange({ programId: e.target.value, sessionId: "", semesterId: "" })} disabled={programs.isLoading}>
          <option value="">Select program</option>
          {programs.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sp-session" className={labelClass}>
          Session
        </Label>
        <Select id="sp-session" value={value.sessionId} onChange={(e) => onChange({ ...value, sessionId: e.target.value, semesterId: "" })} disabled={!value.programId || sessions.isLoading}>
          <option value="">{value.programId && !sessions.isLoading && !sessions.data?.length ? "No sessions yet" : "Select session"}</option>
          {sessions.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isActive ? " (active)" : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sp-semester" className={labelClass}>
          Semester
        </Label>
        <Select id="sp-semester" value={value.semesterId} onChange={(e) => onChange({ ...value, semesterId: e.target.value })} disabled={!value.sessionId || semesters.isLoading}>
          <option value="">{value.sessionId && !semesters.isLoading && !semesters.data?.length ? "No semesters yet" : "Select semester"}</option>
          {semesters.data?.map((s) => (
            <option key={s.id} value={s.id}>
              Semester {s.semesterNumber} · {humanize(s.type)}
              {s.isActive ? " (active)" : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export type { SemesterPickerValue };
export const EMPTY_SEMESTER_PICK: SemesterPickerValue = { programId: "", sessionId: "", semesterId: "" };
