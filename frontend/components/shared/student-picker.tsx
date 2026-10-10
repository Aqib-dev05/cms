"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, UserRound, X } from "lucide-react";
import { fetchStudents } from "@/features/students/api";
import { fullName, type StudentListItem } from "@/features/students/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export interface PickedStudent {
  /** user id */
  userId: string;
  /** studentProfile id — what invoices / library / attendance APIs want */
  profileId: string;
  name: string;
  registrationNo: string;
  programCode: string;
}

export const toPickedStudent = (s: StudentListItem): PickedStudent => ({
  userId: s.id,
  profileId: s.studentProfile.id,
  name: fullName(s.studentProfile),
  registrationNo: s.studentProfile.registrationNo,
  programCode: s.studentProfile.program.code,
});

interface StudentPickerProps {
  value: PickedStudent | null;
  onChange: (student: PickedStudent | null) => void;
  /** only ACTIVE students are offered by default */
  includeInactive?: boolean;
  id?: string;
  error?: string;
}

/** Search-as-you-type student chooser (needs `student.read`). */
export function StudentPicker({ value, onChange, includeInactive = false, id, error }: StudentPickerProps) {
  const [text, setText] = useState("");
  const search = useDebouncedValue(text.trim(), 300);
  const results = useQuery({
    queryKey: queryKeys.students.picker(`${search}|${includeInactive}`),
    queryFn: () => fetchStudents({ page: 1, limit: 8, search, status: includeInactive ? undefined : "ACTIVE" }),
    enabled: search.length >= 2,
    placeholderData: keepPreviousData,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {value.registrationNo} · {value.programCode}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} aria-label="Choose a different student">
          <X aria-hidden="true" /> Change
        </Button>
      </div>
    );
  }

  const list = results.data?.data ?? [];
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Name, reg. no or CNIC (min. 2 letters)"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          className="pl-9"
        />
      </div>
      {search.length >= 2 && (
        <div className="max-h-56 overflow-y-auto rounded-md border bg-card" role="listbox" aria-label="Matching students">
          {results.isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : list.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No students found.</p>
          ) : (
            list.map((s) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onChange(toPickedStudent(s))}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="min-w-0 truncate font-medium">{fullName(s.studentProfile)}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {s.studentProfile.registrationNo} · {s.studentProfile.program.code}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
