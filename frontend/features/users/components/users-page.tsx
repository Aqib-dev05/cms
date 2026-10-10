"use client";

import { useState } from "react";
import { KeyRound, Plus, Power, UserCog } from "lucide-react";
import { z } from "zod";
import { useDepartments } from "@/features/academic/hooks";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { optDate, optEnum, optText, reqDate, reqText, useZodForm } from "@/lib/form";
import { usePageState } from "@/hooks/use-page-state";
import { cnicSchema } from "@/lib/validators";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { PasswordField } from "@/components/shared/password-field";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RoleName } from "@/types";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { useCreateStaff, useResetPassword, useRoles, useToggleUserStatus, useUsers } from "../hooks";
import { userDisplayName, type UserListItem } from "../types";

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
const staffSchema = z.object({
  roleName: reqText(30, "Choose a role"),
  firstName: reqText(50),
  lastName: reqText(50),
  fatherName: optText(100),
  username: z.string({ required_error: "Required" }).min(3, "At least 3 characters").max(30, "At most 30 characters").regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only"),
  email: z.string({ required_error: "Required" }).email("Enter a valid email address"),
  password: z.string({ required_error: "Required" }).min(8, "At least 8 characters"),
  phone: optText(20),
  cnic: z.preprocess((v) => (v === "" ? undefined : v), cnicSchema.optional()),
  gender: optEnum(GENDERS),
  dateOfBirth: optDate,
  designation: optText(100),
  qualification: optText(100),
  joiningDate: reqDate,
  departmentId: z.string().optional(),
  address: optText(255),
});

function CreateStaffDialog({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const roles = useRoles();
  const departments = useDepartments();
  const create = useCreateStaff();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useZodForm(staffSchema, { roleName: "", joiningDate: new Date().toISOString().slice(0, 10), departmentId: "", gender: "" });
  const [general, setGeneral] = useState<string | null>(null);

  const submit = handleSubmit((v) => {
    setGeneral(null);
    create.mutate(
      { ...v, roleName: v.roleName as RoleName, departmentId: v.departmentId || undefined },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          const msg = getErrorMessage(err);
          if (/username/i.test(msg)) setError("username", { message: msg });
          else if (/email/i.test(msg)) setError("email", { message: msg });
          else setGeneral(msg);
        },
      }
    );
  });

  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title="New staff account" description="Creates the person's profile and login together. Students are added from the Students page." onSubmit={submit} isSubmitting={create.isPending} error={general} submitLabel="Create account">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="st-role" label="Role" required error={errors.roleName?.message}>
          <Select {...register("roleName")} disabled={roles.isLoading}>
            <option value="">Select a role</option>
            {roles.data
              ?.filter((r) => r.name !== "STUDENT")
              .map((r) => (
                <option key={r.id} value={r.name}>
                  {r.displayName}
                </option>
              ))}
          </Select>
        </FormField>
        <FormField id="st-dept" label="Department" error={errors.departmentId?.message}>
          <Select {...register("departmentId")} disabled={departments.isLoading}>
            <option value="">None</option>
            {departments.data
              ?.filter((d) => d.isActive)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </Select>
        </FormField>
        <FormField id="st-first" label="First name" required error={errors.firstName?.message}>
          <Input autoComplete="off" {...register("firstName")} />
        </FormField>
        <FormField id="st-last" label="Last name" required error={errors.lastName?.message}>
          <Input autoComplete="off" {...register("lastName")} />
        </FormField>
        <FormField id="st-father" label="Father's name" error={errors.fatherName?.message}>
          <Input autoComplete="off" {...register("fatherName")} />
        </FormField>
        <FormField id="st-gender" label="Gender" error={errors.gender?.message}>
          <Select {...register("gender")}>
            <option value="">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
        </FormField>
        <FormField id="st-dob" label="Date of birth" error={errors.dateOfBirth?.message}>
          <Input type="date" {...register("dateOfBirth")} />
        </FormField>
        <FormField id="st-cnic" label="CNIC" description="12345-1234567-1" error={errors.cnic?.message}>
          <Input inputMode="numeric" autoComplete="off" {...register("cnic")} />
        </FormField>
        <FormField id="st-phone" label="Phone" error={errors.phone?.message}>
          <Input type="tel" autoComplete="off" {...register("phone")} />
        </FormField>
        <FormField id="st-join" label="Joining date" required error={errors.joiningDate?.message}>
          <Input type="date" {...register("joiningDate")} />
        </FormField>
        <FormField id="st-desig" label="Designation" error={errors.designation?.message}>
          <Input autoComplete="off" {...register("designation")} />
        </FormField>
        <FormField id="st-qual" label="Qualification" error={errors.qualification?.message}>
          <Input autoComplete="off" {...register("qualification")} />
        </FormField>
        <FormField id="st-address" label="Address" error={errors.address?.message} className="sm:col-span-2">
          <Textarea {...register("address")} />
        </FormField>
        <FormField id="st-username" label="Username" required description="Lowercase letters, numbers, underscores" error={errors.username?.message}>
          <Input autoComplete="off" autoCapitalize="none" spellCheck={false} {...register("username")} />
        </FormField>
        <FormField id="st-email" label="Login email" required error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...register("email")} />
        </FormField>
        <FormField id="st-password" label="Initial password" required error={errors.password?.message} className="sm:col-span-2">
          <PasswordField {...register("password")} onGenerate={(p) => setValue("password", p, { shouldValidate: true })} />
        </FormField>
      </div>
    </FormDialog>
  );
}

function ResetPasswordDialog({ user, onOpenChange }: { user: UserListItem; onOpenChange: (o: boolean) => void }) {
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useZodForm(z.object({ newPassword: z.string({ required_error: "Required" }).min(8, "At least 8 characters") }), { newPassword: "" });
  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={`Reset password — @${user.username}`}
      description="They will be signed out everywhere and must use the new password."
      onSubmit={handleSubmit((v) => reset.mutate({ id: user.id, newPassword: v.newPassword }, { onSuccess: () => onOpenChange(false) }))}
      isSubmitting={reset.isPending}
      error={reset.isError ? getErrorMessage(reset.error) : null}
      submitLabel="Reset password"
      destructive
    >
      <FormField id="reset-pw" label="New password" required error={errors.newPassword?.message}>
        <PasswordField {...register("newPassword")} onGenerate={(p) => setValue("newPassword", p, { shouldValidate: true })} />
      </FormField>
    </FormDialog>
  );
}

export function UsersPage() {
  const me = useAppSelector(selectUser);
  const { page, limit, params, setPage, setLimit, setSearch } = usePageState(20);
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const roles = useRoles();
  const q = useUsers({ ...params, role: (role || undefined) as RoleName | undefined, isActive: (active || undefined) as "true" | "false" | undefined });
  const toggle = useToggleUserStatus();
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<UserListItem | null>(null);
  const [toggleFor, setToggleFor] = useState<UserListItem | null>(null);

  const columns: Column<UserListItem>[] = [
    {
      id: "user",
      header: "User",
      cell: (u) => (
        <div className="min-w-0">
          <p className="font-medium">{userDisplayName(u)}</p>
          <p className="truncate text-xs text-muted-foreground">@{u.username} · {u.email}</p>
        </div>
      ),
    },
    { id: "role", header: "Role", cell: (u) => u.role.displayName },
    {
      id: "linked",
      header: "Linked record",
      hideOnMobile: true,
      cell: (u) => (u.studentProfile ? <span className="tabular-nums">{u.studentProfile.registrationNo} · {u.studentProfile.program.code}</span> : u.staffProfile ? <span className="tabular-nums">{u.staffProfile.employeeId}{u.staffProfile.department ? ` · ${u.staffProfile.department.code}` : ""}</span> : "—"),
    },
    { id: "login", header: "Last login", hideOnMobile: true, cell: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="text-muted-foreground">Never</span>) },
    { id: "created", header: "Created", hideOnMobile: true, cell: (u) => formatDate(u.createdAt) },
    { id: "status", header: "Status", cell: (u) => <Badge variant={u.isActive ? "success" : "destructive"}>{u.isActive ? "Active" : "Disabled"}</Badge> },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setResetFor(u)} aria-label={`Reset password for ${u.username}`}>
            <KeyRound aria-hidden="true" /> <span className="hidden lg:inline">Reset</span>
          </Button>
          <Button variant="ghost" size="sm" disabled={u.id === me?.id} onClick={() => setToggleFor(u)} aria-label={`${u.isActive ? "Disable" : "Enable"} ${u.username}`}>
            <Power aria-hidden="true" /> <span className="hidden lg:inline">{u.isActive ? "Disable" : "Enable"}</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Every login account in the system."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> New staff account
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput onSearch={setSearch} placeholder="Username, email or name" label="Search users" className="sm:max-w-sm" />
        <Select aria-label="Filter by role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="sm:w-52" disabled={roles.isLoading}>
          <option value="">All roles</option>
          {roles.data?.map((r) => (
            <option key={r.id} value={r.name}>
              {r.displayName}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by account status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} className="sm:w-40">
          <option value="">All accounts</option>
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </Select>
      </div>
      <DataTable
        caption="Users"
        columns={columns}
        data={q.data?.data}
        getRowId={(u) => u.id}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        empty={{ icon: UserCog, title: "No users match", description: "Try a different search or filter." }}
        pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }}
      />
      {creating && <CreateStaffDialog onOpenChange={(o) => !o && setCreating(false)} />}
      {resetFor && <ResetPasswordDialog user={resetFor} onOpenChange={(o) => !o && setResetFor(null)} />}
      <ConfirmDialog
        open={!!toggleFor}
        onOpenChange={(o) => !o && setToggleFor(null)}
        title={toggleFor?.isActive ? "Disable this account?" : "Enable this account?"}
        description={toggleFor ? (toggleFor.isActive ? `@${toggleFor.username} will no longer be able to sign in.` : `@${toggleFor.username} will be able to sign in again.`) : undefined}
        confirmLabel={toggleFor?.isActive ? "Disable" : "Enable"}
        destructive={toggleFor?.isActive}
        loading={toggle.isPending}
        onConfirm={() => toggleFor && toggle.mutate(toggleFor.id, { onSuccess: () => setToggleFor(null) })}
      />
    </>
  );
}
