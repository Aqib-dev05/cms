"use client";

import { useState } from "react";
import { Building2, Pencil, Plus, UserCog } from "lucide-react";
import { z } from "zod";
import { optText, reqText, useZodForm } from "@/lib/form";
import { getErrorMessage } from "@/lib/api";
import { useStaffList } from "@/features/staff/hooks";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAssignHod, useCreateDepartment, useDepartments, useUpdateDepartment } from "../hooks";
import type { Department } from "../types";

const schema = z.object({
  name: reqText(100).pipe(z.string().min(2, "At least 2 characters")),
  code: reqText(10).pipe(z.string().min(2, "At least 2 characters")),
  description: optText(500),
  isActive: z.boolean().optional(),
});

function DepartmentDialog({ open, onOpenChange, department }: { open: boolean; onOpenChange: (o: boolean) => void; department?: Department }) {
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const mutation = department ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, { name: department?.name ?? "", code: department?.code ?? "", description: department?.description ?? "", isActive: department?.isActive ?? true });

  const submit = handleSubmit((v) => {
    const body = { name: v.name, code: v.code, description: v.description };
    if (department) update.mutate({ id: department.id, ...body, isActive: v.isActive }, { onSuccess: () => onOpenChange(false) });
    else create.mutate(body, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={department ? "Edit department" : "New department"}
      onSubmit={submit}
      isSubmitting={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : null}
      submitLabel={department ? "Save changes" : "Create department"}
    >
      <FormField id="dept-name" label="Name" required error={errors.name?.message}>
        <Input autoComplete="off" {...register("name")} />
      </FormField>
      <FormField id="dept-code" label="Code" required description="Short code, e.g. CS" error={errors.code?.message}>
        <Input autoComplete="off" {...register("code")} />
      </FormField>
      <FormField id="dept-desc" label="Description" error={errors.description?.message}>
        <Textarea {...register("description")} />
      </FormField>
      {department && (
        <div className="flex items-center gap-2">
          <Checkbox id="dept-active" {...register("isActive")} />
          <Label htmlFor="dept-active">Active</Label>
        </div>
      )}
    </FormDialog>
  );
}

function AssignHodDialog({ open, onOpenChange, department }: { open: boolean; onOpenChange: (o: boolean) => void; department: Department }) {
  const hods = useStaffList({ page: 1, limit: 50, role: "HOD" });
  const assign = useAssignHod();
  const [hodId, setHodId] = useState("");
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (hodId) assign.mutate({ id: department.id, hodId }, { onSuccess: () => onOpenChange(false) });
  };
  const rows = hods.data?.data ?? [];
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Assign HOD — ${department.name}`}
      description="Pick a staff member whose account has the Head of Department role."
      onSubmit={submit}
      isSubmitting={assign.isPending}
      error={assign.isError ? getErrorMessage(assign.error) : null}
      submitLabel="Assign HOD"
    >
      <div className="space-y-2">
        <Label htmlFor="hod-select">Head of Department</Label>
        <Select id="hod-select" value={hodId} onChange={(e) => setHodId(e.target.value)} disabled={hods.isLoading}>
          <option value="">{hods.isLoading ? "Loading…" : rows.length ? "Select a HOD" : "No HOD accounts yet"}</option>
          {rows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.staffProfile ? `${s.staffProfile.firstName} ${s.staffProfile.lastName}` : s.username}
              {s.staffProfile?.department ? ` · ${s.staffProfile.department.code}` : ""}
            </option>
          ))}
        </Select>
        {!hods.isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Create a staff account with the HOD role first (Users &amp; Roles).</p>}
      </div>
    </FormDialog>
  );
}

export function DepartmentsTab({ canManage }: { canManage: boolean }) {
  const q = useDepartments();
  const [editing, setEditing] = useState<Department | "new" | null>(null);
  const [hodFor, setHodFor] = useState<Department | null>(null);

  const columns: Column<Department>[] = [
    {
      id: "name",
      header: "Department",
      cell: (d) => (
        <div className="min-w-0">
          <p className="font-medium">{d.name}</p>
          <p className="text-xs text-muted-foreground">{d.code}</p>
        </div>
      ),
    },
    { id: "programs", header: "Programs", align: "center", cell: (d) => d._count?.programs ?? 0 },
    { id: "staff", header: "Staff", align: "center", hideOnMobile: true, cell: (d) => d._count?.staffProfiles ?? 0 },
    { id: "hod", header: "HOD", hideOnMobile: true, cell: (d) => (d.headId ? <Badge variant="success">Assigned</Badge> : <span className="text-muted-foreground">Not assigned</span>) },
    { id: "status", header: "Status", cell: (d) => <StatusBadge status={d.isActive ? "ACTIVE" : "RETIRED"} /> },
  ];
  if (canManage) {
    columns.push({
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (d) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setHodFor(d)} aria-label={`Assign HOD for ${d.name}`}>
            <UserCog aria-hidden="true" /> <span className="hidden sm:inline">HOD</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(d)} aria-label={`Edit ${d.name}`}>
            <Pencil aria-hidden="true" /> <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New department
          </Button>
        </div>
      )}
      <DataTable
        caption="Departments"
        columns={columns}
        data={q.data}
        getRowId={(d) => d.id}
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        empty={{ icon: Building2, title: "No departments yet", description: canManage ? "Create the first department to start building the academic structure." : undefined }}
      />
      {editing && <DepartmentDialog key={editing === "new" ? "new" : editing.id} open onOpenChange={(o) => !o && setEditing(null)} department={editing === "new" ? undefined : editing} />}
      {hodFor && <AssignHodDialog key={hodFor.id} open onOpenChange={(o) => !o && setHodFor(null)} department={hodFor} />}
    </div>
  );
}
