"use client";

import { useState } from "react";
import { CalendarRange, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import { reqDate, reqInt, reqText, useZodForm } from "@/lib/form";
import { SEMESTER_TYPES } from "@/lib/constants";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAllPrograms, useCreateSemester, useCreateSession, useSemesters, useSessions, useUpdateSemester, useUpdateSession } from "../hooks";
import type { AcademicSession, Semester } from "../types";

const sessionSchema = z
  .object({ name: reqText(50).pipe(z.string().min(2, "At least 2 characters")), startDate: reqDate, endDate: reqDate, isActive: z.boolean().optional() })
  .refine((v) => v.endDate > v.startDate, { path: ["endDate"], message: "End date must be after the start date" });

function SessionDialog({ programId, session, onOpenChange }: { programId: string; session?: AcademicSession; onOpenChange: (o: boolean) => void }) {
  const create = useCreateSession();
  const update = useUpdateSession();
  const mutation = session ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(sessionSchema, { name: session?.name ?? "", startDate: session?.startDate.slice(0, 10) ?? "", endDate: session?.endDate.slice(0, 10) ?? "", isActive: session?.isActive ?? false });

  const submit = handleSubmit((v) => {
    if (session) update.mutate({ id: session.id, name: v.name, startDate: v.startDate, endDate: v.endDate, isActive: v.isActive }, { onSuccess: () => onOpenChange(false) });
    else create.mutate({ programId, name: v.name, startDate: v.startDate, endDate: v.endDate }, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={session ? "Edit session" : "New academic session"}
      onSubmit={submit}
      isSubmitting={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : null}
      submitLabel={session ? "Save changes" : "Create session"}
    >
      <FormField id="sess-name" label="Name" required description='e.g. "2026-2027"' error={errors.name?.message}>
        <Input autoComplete="off" {...register("name")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="sess-start" label="Start date" required error={errors.startDate?.message}>
          <Input type="date" {...register("startDate")} />
        </FormField>
        <FormField id="sess-end" label="End date" required error={errors.endDate?.message}>
          <Input type="date" {...register("endDate")} />
        </FormField>
      </div>
      {session && (
        <div className="flex items-center gap-2">
          <Checkbox id="sess-active" {...register("isActive")} />
          <Label htmlFor="sess-active">Active session</Label>
        </div>
      )}
    </FormDialog>
  );
}

const semesterSchema = z
  .object({ semesterNumber: reqInt(1, 12), type: z.enum(SEMESTER_TYPES), startDate: reqDate, endDate: reqDate, isActive: z.boolean().optional() })
  .refine((v) => v.endDate > v.startDate, { path: ["endDate"], message: "End date must be after the start date" });

function SemesterDialog({ sessionId, semester, onOpenChange }: { sessionId: string; semester?: Semester; onOpenChange: (o: boolean) => void }) {
  const create = useCreateSemester();
  const update = useUpdateSemester();
  const mutation = semester ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(semesterSchema, {
    semesterNumber: semester ? String(semester.semesterNumber) : "",
    type: semester?.type ?? "FALL",
    startDate: semester?.startDate.slice(0, 10) ?? "",
    endDate: semester?.endDate.slice(0, 10) ?? "",
    isActive: semester?.isActive ?? false,
  });

  const submit = handleSubmit((v) => {
    if (semester) update.mutate({ id: semester.id, ...v }, { onSuccess: () => onOpenChange(false) });
    else create.mutate({ academicSessionId: sessionId, semesterNumber: v.semesterNumber, type: v.type, startDate: v.startDate, endDate: v.endDate }, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={semester ? "Edit semester" : "New semester"}
      onSubmit={submit}
      isSubmitting={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : null}
      submitLabel={semester ? "Save changes" : "Create semester"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="sem-number" label="Semester number" required error={errors.semesterNumber?.message}>
          <Input type="number" inputMode="numeric" min={1} max={12} {...register("semesterNumber")} />
        </FormField>
        <FormField id="sem-type" label="Term" required error={errors.type?.message}>
          <Select {...register("type")}>
            {SEMESTER_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="sem-start" label="Start date" required error={errors.startDate?.message}>
          <Input type="date" {...register("startDate")} />
        </FormField>
        <FormField id="sem-end" label="End date" required error={errors.endDate?.message}>
          <Input type="date" {...register("endDate")} />
        </FormField>
      </div>
      {semester && (
        <div className="flex items-center gap-2">
          <Checkbox id="sem-active" {...register("isActive")} />
          <Label htmlFor="sem-active">Active semester</Label>
        </div>
      )}
    </FormDialog>
  );
}

export function SessionsTab({ canManage }: { canManage: boolean }) {
  const programs = useAllPrograms();
  const [programId, setProgramId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const sessions = useSessions(programId);
  const semesters = useSemesters(sessionId);
  const [sessionEdit, setSessionEdit] = useState<AcademicSession | "new" | null>(null);
  const [semesterEdit, setSemesterEdit] = useState<Semester | "new" | null>(null);

  const sessionColumns: Column<AcademicSession>[] = [
    { id: "name", header: "Session", cell: (s) => <span className="font-medium">{s.name}</span> },
    { id: "dates", header: "Dates", hideOnMobile: true, cell: (s) => `${formatDate(s.startDate)} → ${formatDate(s.endDate)}` },
    { id: "semesters", header: "Semesters", align: "center", cell: (s) => s._count?.semesters ?? 0 },
    { id: "status", header: "Status", cell: (s) => <StatusBadge status={s.isActive ? "ACTIVE" : "CLOSED"} /> },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (s) => (
        <div className="flex justify-end gap-1">
          <Button variant={sessionId === s.id ? "secondary" : "ghost"} size="sm" onClick={() => setSessionId(s.id)} aria-pressed={sessionId === s.id}>
            Semesters
          </Button>
          {canManage && (
            <Button variant="ghost" size="sm" onClick={() => setSessionEdit(s)} aria-label={`Edit session ${s.name}`}>
              <Pencil aria-hidden="true" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const semesterColumns: Column<Semester>[] = [
    { id: "no", header: "Semester", cell: (s) => <span className="font-medium">Semester {s.semesterNumber}</span> },
    { id: "type", header: "Term", cell: (s) => humanize(s.type) },
    { id: "dates", header: "Dates", hideOnMobile: true, cell: (s) => `${formatDate(s.startDate)} → ${formatDate(s.endDate)}` },
    { id: "sections", header: "Sections", align: "center", cell: (s) => s._count?.sections ?? 0 },
    { id: "status", header: "Status", cell: (s) => <StatusBadge status={s.isActive ? "ACTIVE" : "CLOSED"} /> },
  ];
  if (canManage) {
    semesterColumns.push({
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (s) => (
        <Button variant="ghost" size="sm" onClick={() => setSemesterEdit(s)} aria-label={`Edit semester ${s.semesterNumber}`}>
          <Pencil aria-hidden="true" />
        </Button>
      ),
    });
  }

  const selectedSession = sessions.data?.find((s) => s.id === sessionId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-72">
          <Label htmlFor="ss-program">Program</Label>
          <Select
            id="ss-program"
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setSessionId("");
            }}
            disabled={programs.isLoading}
          >
            <option value="">Select a program</option>
            {programs.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </Select>
        </div>
        {canManage && programId && (
          <Button className="sm:ml-auto" onClick={() => setSessionEdit("new")}>
            <Plus aria-hidden="true" /> New session
          </Button>
        )}
      </div>

      {!programId ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Choose a program to see its academic sessions.</p>
      ) : (
        <DataTable
          caption="Academic sessions"
          columns={sessionColumns}
          data={sessions.data}
          getRowId={(s) => s.id}
          isLoading={sessions.isLoading}
          isError={sessions.isError}
          error={sessions.error}
          onRetry={() => sessions.refetch()}
          empty={{ icon: CalendarRange, title: "No sessions for this program", description: canManage ? "Create a session such as 2026-2027." : undefined }}
        />
      )}

      {selectedSession && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Semesters in {selectedSession.name}</CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setSemesterEdit("new")}>
                <Plus aria-hidden="true" /> New semester
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <DataTable
              caption={`Semesters of ${selectedSession.name}`}
              columns={semesterColumns}
              data={semesters.data}
              getRowId={(s) => s.id}
              isLoading={semesters.isLoading}
              isError={semesters.isError}
              error={semesters.error}
              onRetry={() => semesters.refetch()}
              empty={{ icon: CalendarRange, title: "No semesters yet" }}
            />
          </CardContent>
        </Card>
      )}

      {sessionEdit && <SessionDialog key={sessionEdit === "new" ? "new" : sessionEdit.id} programId={programId} session={sessionEdit === "new" ? undefined : sessionEdit} onOpenChange={(o) => !o && setSessionEdit(null)} />}
      {semesterEdit && sessionId && <SemesterDialog key={semesterEdit === "new" ? "new" : semesterEdit.id} sessionId={sessionId} semester={semesterEdit === "new" ? undefined : semesterEdit} onOpenChange={(o) => !o && setSemesterEdit(null)} />}
    </div>
  );
}
