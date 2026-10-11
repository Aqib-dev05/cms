"use client";

import { useState } from "react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { optText, reqText, useZodForm } from "@/lib/form";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useCreateAssistant, useDuties, useResetAssistantPassword, useSetDuties } from "../hooks";
import type { Assistant } from "../types";

/** One checkbox per duty — the head clerk ticks what this assistant is responsible for. */
export function DutyChecklist({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const duties = useDuties();
  const toggle = (key: string) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Duties</legend>
      <p className="text-xs text-muted-foreground">Tick everything this assistant should handle. They only see the screens for the duties you give.</p>
      {duties.isLoading && <p className="text-sm text-muted-foreground">Loading duties…</p>}
      <div className="grid gap-2">
        {duties.data?.map((d) => (
          <label key={d.key} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50">
            <Checkbox className="mt-0.5" checked={value.includes(d.key)} onChange={() => toggle(d.key)} />
            <span>
              <span className="block text-sm font-medium">{d.label}</span>
              <span className="block text-xs text-muted-foreground">{d.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}

const createSchema = z.object({
  firstName: reqText(50),
  lastName: reqText(50),
  username: z.string().trim().min(3, "At least 3 characters").max(30).regex(/^[a-z0-9_.]+$/, "Lowercase letters, numbers, . and _ only"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  phone: optText(20),
  designation: optText(100),
});

export function CreateAssistantDialog({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const create = useCreateAssistant();
  const [duties, setDuties] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(createSchema, { firstName: "", lastName: "", username: "", email: "", password: "", phone: "", designation: "" });

  const submit = handleSubmit((v) => create.mutate({ ...v, duties }, { onSuccess: () => onOpenChange(false) }));

  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title="New assistant" description="Creates an assistant clerk account. You decide what they can do." submitLabel="Create assistant" onSubmit={submit} isSubmitting={create.isPending} error={create.isError ? getErrorMessage(create.error) : null}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="as-first" label="First name" required error={errors.firstName?.message}><Input autoComplete="off" {...register("firstName")} /></FormField>
        <FormField id="as-last" label="Last name" required error={errors.lastName?.message}><Input autoComplete="off" {...register("lastName")} /></FormField>
        <FormField id="as-user" label="Username" required error={errors.username?.message}><Input autoComplete="off" {...register("username")} /></FormField>
        <FormField id="as-email" label="Email" required error={errors.email?.message}><Input type="email" autoComplete="off" {...register("email")} /></FormField>
        <FormField id="as-pass" label="Temporary password" required error={errors.password?.message}><Input type="text" autoComplete="new-password" {...register("password")} /></FormField>
        <FormField id="as-phone" label="Phone" error={errors.phone?.message}><Input autoComplete="off" {...register("phone")} /></FormField>
      </div>
      <FormField id="as-desig" label="Designation" description="Defaults to Assistant Clerk." error={errors.designation?.message}><Input autoComplete="off" {...register("designation")} /></FormField>
      <DutyChecklist value={duties} onChange={setDuties} />
    </FormDialog>
  );
}

export function EditDutiesDialog({ assistant, onOpenChange }: { assistant: Assistant; onOpenChange: (o: boolean) => void }) {
  const save = useSetDuties();
  const [duties, setDuties] = useState<string[]>(assistant.duties);
  const name = assistant.staffProfile ? `${assistant.staffProfile.firstName} ${assistant.staffProfile.lastName}` : assistant.username;
  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title={`Duties — ${name}`} submitLabel="Save duties" onSubmit={(e) => { e.preventDefault(); save.mutate({ id: assistant.id, duties }, { onSuccess: () => onOpenChange(false) }); }} isSubmitting={save.isPending} error={save.isError ? getErrorMessage(save.error) : null}>
      <DutyChecklist value={duties} onChange={setDuties} />
    </FormDialog>
  );
}

const resetSchema = z.object({ newPassword: z.string().min(8, "At least 8 characters") });

export function ResetPasswordDialog({ assistant, onOpenChange }: { assistant: Assistant; onOpenChange: (o: boolean) => void }) {
  const reset = useResetAssistantPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(resetSchema, { newPassword: "" });
  const submit = handleSubmit((v) => reset.mutate({ id: assistant.id, newPassword: v.newPassword }, { onSuccess: () => onOpenChange(false) }));
  return (
    <FormDialog open onOpenChange={onOpenChange} title={`Reset password — ${assistant.username}`} description="They are signed out everywhere and must use the new password." submitLabel="Reset password" onSubmit={submit} isSubmitting={reset.isPending} error={reset.isError ? getErrorMessage(reset.error) : null}>
      <FormField id="rp-pass" label="New password" required error={errors.newPassword?.message}><Input type="text" autoComplete="new-password" {...register("newPassword")} /></FormField>
    </FormDialog>
  );
}
