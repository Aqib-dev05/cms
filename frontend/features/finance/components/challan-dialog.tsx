"use client";

import { useState } from "react";
import { z } from "zod";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { openPdf } from "@/lib/api-helpers";
import { formatCurrency } from "@/lib/format";
import { optInt, optText, reqDate, reqId, reqText, useZodForm } from "@/lib/form";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBulkCreateInvoices, useStructures } from "../hooks";
import type { BulkInvoiceResult } from "../types";

const schema = z.object({
  feeStructureId: reqId("Choose a fee structure"),
  semester: reqText(50, "Give the term a label, e.g. Fall 2026"),
  dueDate: reqDate,
  currentSemester: optInt(1, 12),
  remarks: optText(300),
});

/** Challan run: one invoice (and printable 3-copy challan) for every active student of a program. */
export function BulkChallanDialog({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const structures = useStructures();
  const bulk = useBulkCreateInvoices();
  const [result, setResult] = useState<{ res: BulkInvoiceResult; structureId: string; semester: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, { feeStructureId: "", semester: "", dueDate: "", currentSemester: "", remarks: "" });

  const submit = handleSubmit((v) =>
    bulk.mutate(
      { feeStructureId: v.feeStructureId, semester: v.semester, dueDate: v.dueDate, remarks: v.remarks, currentSemester: v.currentSemester },
      { onSuccess: (res) => setResult({ res, structureId: v.feeStructureId, semester: v.semester }) }
    )
  );

  const print = async () => {
    if (!result) return;
    setPrinting(true);
    try {
      await openPdf(`/pdf/fee-challans?feeStructureId=${result.structureId}&semester=${encodeURIComponent(result.semester)}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setPrinting(false);
    }
  };

  if (result) {
    const { res } = result;
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Challans generated</DialogTitle>
            <DialogDescription>
              {res.created} new invoice{res.created === 1 ? "" : "s"} of {formatCurrency(res.totalAmount)} each.
              {res.skipped > 0 && ` ${res.skipped} student${res.skipped === 1 ? " was" : "s were"} skipped because they already have this term's invoice.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={print} loading={printing}>
              <FileText aria-hidden="true" /> Print all challans (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <FormDialog open onOpenChange={onOpenChange} title="Generate challans" description="Creates one invoice per active student of the program and lets you print the challans. Students who already have this term's invoice are skipped." submitLabel="Generate" onSubmit={submit} isSubmitting={bulk.isPending} error={bulk.isError ? getErrorMessage(bulk.error) : null}>
      <FormField id="bc-structure" label="Fee structure" required error={errors.feeStructureId?.message}>
        <Select {...register("feeStructureId")} disabled={structures.isLoading}>
          <option value="">Choose…</option>
          {structures.data?.map((s) => (
            <option key={s.id} value={s.id}>{s.name} · {s.program.code} · {s.session}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="bc-sem" label="Term label" required error={errors.semester?.message}>
          <Input autoComplete="off" placeholder="e.g. Fall 2026" {...register("semester")} />
        </FormField>
        <FormField id="bc-due" label="Due date" required error={errors.dueDate?.message}>
          <Input type="date" {...register("dueDate")} />
        </FormField>
        <FormField id="bc-cur" label="Only students in semester" description="Optional (1–12)." error={errors.currentSemester?.message}>
          <Input inputMode="numeric" {...register("currentSemester")} />
        </FormField>
      </div>
      <FormField id="bc-remarks" label="Remarks" error={errors.remarks?.message}>
        <Input autoComplete="off" {...register("remarks")} />
      </FormField>
    </FormDialog>
  );
}
