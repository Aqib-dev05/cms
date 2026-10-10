"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { usePrograms } from "@/features/academic/hooks";
import { getErrorMessage } from "@/lib/api";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, humanize } from "@/lib/format";
import { optText, reqDate, reqId, reqNumber, reqText, useZodForm } from "@/lib/form";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { StudentPicker, type PickedStudent } from "@/components/shared/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApplyDiscount, useCreateInvoice, useFeeTypes, useRecordPayment, useStructures } from "../hooks";
import type { Invoice } from "../types";

const invoiceSchema = z.object({
  feeStructureId: z.string().optional(),
  semester: optText(50),
  dueDate: reqDate,
  remarks: optText(300),
  items: z.array(z.object({ feeTypeId: reqId("Choose a fee type"), amount: reqNumber(0) })).min(1, "Add at least one item"),
});

export function CreateInvoiceDialog({ onOpenChange, initialStudent }: { onOpenChange: (o: boolean) => void; initialStudent?: PickedStudent | null }) {
  const feeTypes = useFeeTypes();
  const structures = useStructures();
  const create = useCreateInvoice();
  const [student, setStudent] = useState<PickedStudent | null>(initialStudent ?? null);
  const [studentError, setStudentError] = useState<string | undefined>();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useZodForm(invoiceSchema, { feeStructureId: "", semester: "", dueDate: "", remarks: "", items: [{ feeTypeId: "", amount: "" }] });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });
  const total = (watch("items") ?? []).reduce((s, i) => s + (Number(i?.amount) || 0), 0);

  const onStructure = (id: string) => {
    const st = structures.data?.find((s) => s.id === id);
    if (st) replace(st.items.map((i) => ({ feeTypeId: i.feeTypeId, amount: String(i.amount) })));
  };

  const submit = handleSubmit((v) => {
    if (!student) return setStudentError("Choose a student");
    create.mutate({ studentProfileId: student.profileId, feeStructureId: v.feeStructureId || undefined, semester: v.semester, dueDate: v.dueDate, remarks: v.remarks, items: v.items }, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title="New invoice" onSubmit={submit} isSubmitting={create.isPending} error={create.isError ? getErrorMessage(create.error) : null} submitLabel="Create invoice">
      <FormField id="inv-student" label="Student" required error={studentError}>
        <StudentPicker id="inv-student" value={student} onChange={(s) => { setStudent(s); setStudentError(undefined); }} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="inv-structure" label="Start from a fee structure" description="Optional — fills in the items below.">
          <Select {...register("feeStructureId", { onChange: (e) => onStructure(e.target.value) })} disabled={structures.isLoading}>
            <option value="">None</option>
            {structures.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.program.code} · {s.session}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="inv-semester" label="Semester label" error={errors.semester?.message}>
          <Input autoComplete="off" placeholder="e.g. Fall 2026" {...register("semester")} />
        </FormField>
        <FormField id="inv-due" label="Due date" required error={errors.dueDate?.message}>
          <Input type="date" {...register("dueDate")} />
        </FormField>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Items</legend>
        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-start">
            <FormField id={`inv-item-${i}-type`} label="Fee type" className="[&>label]:sr-only" error={errors.items?.[i]?.feeTypeId?.message}>
              <Select {...register(`items.${i}.feeTypeId`)} disabled={feeTypes.isLoading}>
                <option value="">Fee type</option>
                {feeTypes.data?.filter((t) => t.isActive).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id={`inv-item-${i}-amount`} label="Amount (PKR)" className="[&>label]:sr-only" error={errors.items?.[i]?.amount?.message}>
              <Input type="number" inputMode="decimal" min={0} step="any" placeholder="Amount" {...register(`items.${i}.amount`)} />
            </FormField>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)} disabled={fields.length === 1} className="sm:mt-0.5">
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        {errors.items?.message && <p role="alert" className="text-sm text-destructive">{errors.items.message}</p>}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => append({ feeTypeId: "", amount: "" })}>
            <Plus aria-hidden="true" /> Add item
          </Button>
          <p className="text-sm font-medium tabular-nums">Total: {formatCurrency(total)}</p>
        </div>
      </fieldset>
      <FormField id="inv-remarks" label="Remarks" error={errors.remarks?.message}>
        <Textarea {...register("remarks")} />
      </FormField>
    </FormDialog>
  );
}

export function RecordPaymentDialog({ invoice, onOpenChange }: { invoice: Invoice; onOpenChange: (o: boolean) => void }) {
  const pay = useRecordPayment();
  const schema = z.object({
    amount: reqNumber(0).refine((n) => (n as number) <= invoice.dueAmount, `Can't exceed the amount due (${formatCurrency(invoice.dueAmount)})`),
    method: z.enum(PAYMENT_METHODS),
    transactionId: optText(100),
    remarks: optText(300),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, { amount: String(invoice.dueAmount), method: "CASH", transactionId: "", remarks: "" });
  return (
    <FormDialog open onOpenChange={onOpenChange} title={`Record payment — ${invoice.invoiceNo}`} description={`Amount due: ${formatCurrency(invoice.dueAmount)}`} onSubmit={handleSubmit((v) => pay.mutate({ invoiceId: invoice.id, ...v }, { onSuccess: () => onOpenChange(false) }))} isSubmitting={pay.isPending} error={pay.isError ? getErrorMessage(pay.error) : null} submitLabel="Record payment">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="pay-amount" label="Amount (PKR)" required error={errors.amount?.message}>
          <Input type="number" inputMode="decimal" min={0} step="any" {...register("amount")} />
        </FormField>
        <FormField id="pay-method" label="Method" required error={errors.method?.message}>
          <Select {...register("method")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {humanize(m)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="pay-tx" label="Transaction / cheque no." error={errors.transactionId?.message} className="sm:col-span-2">
          <Input autoComplete="off" {...register("transactionId")} />
        </FormField>
        <FormField id="pay-remarks" label="Remarks" error={errors.remarks?.message} className="sm:col-span-2">
          <Textarea {...register("remarks")} />
        </FormField>
      </div>
    </FormDialog>
  );
}

export function DiscountDialog({ invoice, onOpenChange }: { invoice: Invoice; onOpenChange: (o: boolean) => void }) {
  const apply = useApplyDiscount();
  const schema = z.object({
    amount: reqNumber(0).refine((n) => (n as number) <= invoice.dueAmount, `Can't exceed the amount due (${formatCurrency(invoice.dueAmount)})`),
    reason: reqText(300).pipe(z.string().min(5, "Give a short reason (5+ characters)")),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, { amount: "", reason: "" });
  return (
    <FormDialog open onOpenChange={onOpenChange} title={`Apply discount — ${invoice.invoiceNo}`} description={`Amount due: ${formatCurrency(invoice.dueAmount)}`} onSubmit={handleSubmit((v) => apply.mutate({ invoiceId: invoice.id, ...v }, { onSuccess: () => onOpenChange(false) }))} isSubmitting={apply.isPending} error={apply.isError ? getErrorMessage(apply.error) : null} submitLabel="Apply discount">
      <FormField id="disc-amount" label="Discount amount (PKR)" required error={errors.amount?.message}>
        <Input type="number" inputMode="decimal" min={0} step="any" {...register("amount")} />
      </FormField>
      <FormField id="disc-reason" label="Reason" required error={errors.reason?.message}>
        <Textarea {...register("reason")} />
      </FormField>
    </FormDialog>
  );
}
