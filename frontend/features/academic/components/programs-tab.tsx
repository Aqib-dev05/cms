"use client";

import { useState } from "react";
import { GraduationCap, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { optInt, optText, reqText, useZodForm } from "@/lib/form";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAllPrograms, useCreateProgram, useDepartments, useUpdateProgram } from "../hooks";
import type { Program } from "../types";

const baseShape = {
  name: reqText(100).pipe(z.string().min(2, "At least 2 characters")),
  code: reqText(10).pipe(z.string().min(2, "At least 2 characters")),
  description: optText(500),
  durationYears: optInt(1, 6),
  totalSemesters: optInt(1, 12),
  isActive: z.boolean().optional(),
};
const schema = z.object({ ...baseShape, departmentId: z.string().optional() });

function ProgramDialog({ onOpenChange, program }: { onOpenChange: (o: boolean) => void; program?: Program }) {
  const departments = useDepartments();
  const create = useCreateProgram();
  const update = useUpdateProgram();
  const mutation = program ? update : create;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useZodForm(schema, {
    name: program?.name ?? "",
    code: program?.code ?? "",
    description: program?.description ?? "",
    durationYears: program?.durationYears !== undefined ? String(program.durationYears) : "4",
    totalSemesters: program?.totalSemesters !== undefined ? String(program.totalSemesters) : "8",
    isActive: program?.isActive ?? true,
    departmentId: "",
  });

  const submit = handleSubmit((v) => {
    const { departmentId, isActive, ...rest } = v;
    if (program) return update.mutate({ id: program.id, ...rest, isActive }, { onSuccess: () => onOpenChange(false) });
    if (!departmentId) return setError("departmentId", { message: "Choose a department" });
    create.mutate({ ...rest, departmentId }, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={program ? "Edit program" : "New program"}
      onSubmit={submit}
      isSubmitting={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : null}
      submitLabel={program ? "Save changes" : "Create program"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="prog-name" label="Name" required error={errors.name?.message} className="sm:col-span-2">
          <Input autoComplete="off" {...register("name")} />
        </FormField>
        <FormField id="prog-code" label="Code" required description="e.g. BSCS" error={errors.code?.message}>
          <Input autoComplete="off" {...register("code")} />
        </FormField>
        {!program && (
          <FormField id="prog-dept" label="Department" required error={errors.departmentId?.message}>
            <Select {...register("departmentId")} disabled={departments.isLoading}>
              <option value="">Select department</option>
              {departments.data
                ?.filter((d) => d.isActive)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </Select>
          </FormField>
        )}
        <FormField id="prog-years" label="Duration (years)" error={errors.durationYears?.message}>
          <Input type="number" inputMode="numeric" min={1} max={6} {...register("durationYears")} />
        </FormField>
        <FormField id="prog-sems" label="Total semesters" error={errors.totalSemesters?.message}>
          <Input type="number" inputMode="numeric" min={1} max={12} {...register("totalSemesters")} />
        </FormField>
        <FormField id="prog-desc" label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea {...register("description")} />
        </FormField>
        {program && (
          <div className="flex items-center gap-2">
            <Checkbox id="prog-active" {...register("isActive")} />
            <Label htmlFor="prog-active">Active</Label>
          </div>
        )}
      </div>
    </FormDialog>
  );
}

export function ProgramsTab({ canManage }: { canManage: boolean }) {
  const q = useAllPrograms();
  const [editing, setEditing] = useState<Program | "new" | null>(null);

  const columns: Column<Program>[] = [
    {
      id: "program",
      header: "Program",
      cell: (p) => (
        <div className="min-w-0">
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.code}</p>
        </div>
      ),
    },
    { id: "dept", header: "Department", hideOnMobile: true, cell: (p) => p.department.name },
    { id: "duration", header: "Duration", align: "center", hideOnMobile: true, cell: (p) => (p.durationYears ? `${p.durationYears} yrs · ${p.totalSemesters} sem` : "—") },
    { id: "students", header: "Students", align: "center", cell: (p) => p._count?.studentProfiles ?? 0 },
    { id: "status", header: "Status", cell: (p) => <StatusBadge status={p.isActive ? "ACTIVE" : "RETIRED"} /> },
  ];
  if (canManage) {
    columns.push({
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (p) => (
        <Button variant="ghost" size="sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
          <Pencil aria-hidden="true" /> <span className="hidden sm:inline">Edit</span>
        </Button>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New program
          </Button>
        </div>
      )}
      <DataTable
        caption="Programs"
        columns={columns}
        data={q.data}
        getRowId={(p) => p.id}
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        empty={{ icon: GraduationCap, title: "No programs yet", description: canManage ? "Add programs like BSCS or BBA under a department." : undefined }}
      />
      {editing && <ProgramDialog key={editing === "new" ? "new" : editing.id} onOpenChange={(o) => !o && setEditing(null)} program={editing === "new" ? undefined : editing} />}
    </div>
  );
}
