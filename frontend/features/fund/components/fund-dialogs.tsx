"use client";

import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { humanize } from "@/lib/format";
import { optText, reqDate, reqNumber, reqText, useZodForm } from "@/lib/form";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateFundEntry, useFundCategories, useVoidFundEntry } from "../hooks";
import type { FundEntry, FundType } from "../types";

const schema = z.object({
  category: reqText(50, "Choose a category"),
  source: optText(150),
  amount: reqNumber(0),
  entryDate: reqDate,
  description: reqText(300),
  reference: optText(100),
});

export function AddFundEntryDialog({ type, onOpenChange }: { type: FundType; onOpenChange: (o: boolean) => void }) {
  const categories = useFundCategories();
  const create = useCreateFundEntry();
  const today = new Date().toISOString().slice(0, 10);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, { category: "", source: "", amount: "", entryDate: today, description: "", reference: "" });
  const submit = handleSubmit((v) => create.mutate({ type, ...v }, { onSuccess: () => onOpenChange(false) }));
  const income = type === "INCOME";

  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title={income ? "Record income" : "Record expense"} description={income ? "Government grants, donations and other money from outside. Fee collections are added automatically." : "Money the college spent."} submitLabel="Save entry" onSubmit={submit} isSubmitting={create.isPending} error={create.isError ? getErrorMessage(create.error) : null}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="fe-cat" label="Category" required error={errors.category?.message}>
          <Select {...register("category")} disabled={categories.isLoading}>
            <option value="">Choose…</option>
            {categories.data?.[type].map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
          </Select>
        </FormField>
        <FormField id="fe-amount" label="Amount (PKR)" required error={errors.amount?.message}><Input inputMode="decimal" {...register("amount")} /></FormField>
        <FormField id="fe-date" label="Date" required error={errors.entryDate?.message}><Input type="date" max={today} {...register("entryDate")} /></FormField>
        <FormField id="fe-ref" label="Reference no." description="Cheque, voucher or letter number." error={errors.reference?.message}><Input autoComplete="off" {...register("reference")} /></FormField>
      </div>
      <FormField id="fe-source" label={income ? "Received from" : "Paid to"} error={errors.source?.message}><Input autoComplete="off" placeholder={income ? "e.g. Higher Education Department" : "e.g. electricity company"} {...register("source")} /></FormField>
      <FormField id="fe-desc" label="Description" required error={errors.description?.message}><Textarea rows={2} {...register("description")} /></FormField>
    </FormDialog>
  );
}

const voidSchema = z.object({ reason: reqText(300, "Give a reason") });

export function VoidEntryDialog({ entry, onOpenChange }: { entry: FundEntry; onOpenChange: (o: boolean) => void }) {
  const voidIt = useVoidFundEntry();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useZodForm(voidSchema, { reason: "" });
  const submit = handleSubmit(({ reason }) => {
    if (reason.length < 5) return setError("reason", { message: "At least 5 characters" });
    voidIt.mutate({ id: entry.id, reason }, { onSuccess: () => onOpenChange(false) });
  });
  return (
    <FormDialog open onOpenChange={onOpenChange} destructive title="Void this entry?" description="Entries are never deleted — a voided entry stays in the history but no longer counts toward the balance." submitLabel="Void entry" onSubmit={submit} isSubmitting={voidIt.isPending} error={voidIt.isError ? getErrorMessage(voidIt.error) : null}>
      <FormField id="vd-reason" label="Reason" required error={errors.reason?.message}><Textarea rows={3} {...register("reason")} /></FormField>
    </FormDialog>
  );
}
