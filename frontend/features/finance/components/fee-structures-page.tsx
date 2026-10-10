"use client";

import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Layers, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { z } from "zod";
import { usePrograms } from "@/features/academic/hooks";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { optText, reqId, reqNumber, reqText, useZodForm } from "@/lib/form";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateFeeType, useCreateStructure, useFeeTypes, useStructures, useUpdateFeeType } from "../hooks";
import type { FeeStructure, FeeType } from "../types";

const typeSchema = z.object({ name: reqText(100).pipe(z.string().min(2, "At least 2 characters")), description: optText(300) });

function FeeTypeDialog({ feeType, onOpenChange }: { feeType?: FeeType; onOpenChange: (o: boolean) => void }) {
  const create = useCreateFeeType();
  const update = useUpdateFeeType();
  const mutation = feeType ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(typeSchema, { name: feeType?.name ?? "", description: feeType?.description ?? "" });
  const submit = handleSubmit((v) => (feeType ? update.mutate({ id: feeType.id, ...v }, { onSuccess: () => onOpenChange(false) }) : create.mutate(v, { onSuccess: () => onOpenChange(false) })));
  return (
    <FormDialog open onOpenChange={onOpenChange} title={feeType ? "Edit fee type" : "New fee type"} onSubmit={submit} isSubmitting={mutation.isPending} error={mutation.isError ? getErrorMessage(mutation.error) : null} submitLabel={feeType ? "Save changes" : "Create fee type"}>
      <FormField id="ft-name" label="Name" required description="e.g. Tuition fee, Library fee" error={errors.name?.message}>
        <Input autoComplete="off" {...register("name")} />
      </FormField>
      <FormField id="ft-desc" label="Description" error={errors.description?.message}>
        <Input autoComplete="off" {...register("description")} />
      </FormField>
    </FormDialog>
  );
}

const structureSchema = z.object({
  name: reqText(100).pipe(z.string().min(2, "At least 2 characters")),
  programId: reqId("Choose a program"),
  session: reqText(20).pipe(z.string().min(2, "At least 2 characters")),
  items: z.array(z.object({ feeTypeId: reqId("Choose a fee type"), amount: reqNumber(0), isRequired: z.boolean().optional() })).min(1, "Add at least one item"),
});

function StructureDialog({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const programs = usePrograms();
  const feeTypes = useFeeTypes();
  const create = useCreateStructure();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useZodForm(structureSchema, { name: "", programId: "", session: "", items: [{ feeTypeId: "", amount: "", isRequired: true }] });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const total = (watch("items") ?? []).reduce((s, i) => s + (Number(i?.amount) || 0), 0);
  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title="New fee structure" description="A reusable template of fees for one program and session." onSubmit={handleSubmit((v) => create.mutate(v, { onSuccess: () => onOpenChange(false) }))} isSubmitting={create.isPending} error={create.isError ? getErrorMessage(create.error) : null} submitLabel="Create structure">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="fs-name" label="Name" required error={errors.name?.message} className="sm:col-span-2">
          <Input autoComplete="off" placeholder="e.g. BSCS Fall 2026" {...register("name")} />
        </FormField>
        <FormField id="fs-program" label="Program" required error={errors.programId?.message}>
          <Select {...register("programId")} disabled={programs.isLoading}>
            <option value="">Select program</option>
            {programs.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="fs-session" label="Session" required error={errors.session?.message}>
          <Input autoComplete="off" placeholder="2026-2027" {...register("session")} />
        </FormField>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Items</legend>
        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto_auto] sm:items-start">
            <FormField id={`fs-item-${i}-type`} label="Fee type" className="[&>label]:sr-only" error={errors.items?.[i]?.feeTypeId?.message}>
              <Select {...register(`items.${i}.feeTypeId`)} disabled={feeTypes.isLoading}>
                <option value="">Fee type</option>
                {feeTypes.data?.filter((t) => t.isActive).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id={`fs-item-${i}-amount`} label="Amount (PKR)" className="[&>label]:sr-only" error={errors.items?.[i]?.amount?.message}>
              <Input type="number" inputMode="decimal" min={0} step="any" placeholder="Amount" {...register(`items.${i}.amount`)} />
            </FormField>
            <div className="flex items-center gap-2 sm:h-10">
              <Checkbox id={`fs-item-${i}-req`} {...register(`items.${i}.isRequired`)} />
              <Label htmlFor={`fs-item-${i}-req`}>Required</Label>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)} disabled={fields.length === 1}>
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        {errors.items?.message && <p role="alert" className="text-sm text-destructive">{errors.items.message}</p>}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => append({ feeTypeId: "", amount: "", isRequired: true })}>
            <Plus aria-hidden="true" /> Add item
          </Button>
          <p className="text-sm font-medium tabular-nums">Total: {formatCurrency(total)}</p>
        </div>
      </fieldset>
    </FormDialog>
  );
}

function FeeTypesTab({ canManage }: { canManage: boolean }) {
  const q = useFeeTypes();
  const [editing, setEditing] = useState<FeeType | "new" | null>(null);
  const columns: Column<FeeType>[] = [
    { id: "name", header: "Fee type", cell: (t) => <span className="font-medium">{t.name}</span> },
    { id: "desc", header: "Description", hideOnMobile: true, cell: (t) => t.description ?? "—" },
    { id: "status", header: "Status", cell: (t) => (t.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>) },
  ];
  if (canManage) columns.push({ id: "actions", header: "", align: "right", cell: (t) => <Button variant="ghost" size="sm" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><Pencil aria-hidden="true" /></Button> });
  return (
    <div className="space-y-4">
      {canManage && <div className="flex justify-end"><Button onClick={() => setEditing("new")}><Plus aria-hidden="true" /> New fee type</Button></div>}
      <DataTable caption="Fee types" columns={columns} data={q.data} getRowId={(t) => t.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: Tag, title: "No fee types yet", description: "Add types such as tuition, library or exam fee." }} />
      {editing && <FeeTypeDialog key={editing === "new" ? "new" : editing.id} feeType={editing === "new" ? undefined : editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </div>
  );
}

function StructuresTab({ canManage }: { canManage: boolean }) {
  const programs = usePrograms();
  const [programId, setProgramId] = useState("");
  const q = useStructures(programId || undefined);
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select aria-label="Filter by program" value={programId} onChange={(e) => setProgramId(e.target.value)} className="sm:w-64" disabled={programs.isLoading}>
          <option value="">All programs</option>
          {programs.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </Select>
        {canManage && <Button onClick={() => setCreating(true)}><Plus aria-hidden="true" /> New structure</Button>}
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground" aria-busy="true">Loading…</p>
      ) : (q.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{q.isError ? getErrorMessage(q.error) : "No fee structures yet."}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {q.data!.map((s: FeeStructure) => (
            <Card key={s.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{s.program.code} · {s.session}</p>
                </div>
                <p className="font-heading text-lg font-semibold tabular-nums">{formatCurrency(s.items.reduce((t, i) => t + i.amount, 0))}</p>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {s.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span>{i.feeType.name}{!i.isRequired && <span className="ml-2 text-xs text-muted-foreground">(optional)</span>}</span>
                      <span className="tabular-nums">{formatCurrency(i.amount)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {creating && <StructureDialog onOpenChange={(o) => !o && setCreating(false)} />}
    </div>
  );
}

export function FeeStructuresPage({ canManage = true }: { canManage?: boolean }) {
  const [tab, setTab] = useState("structures");
  return (
    <>
      <PageHeader title="Fee structures" description="Fee types and the per-program templates invoices are built from." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Fee setup">
          <TabsTrigger value="structures">Structures</TabsTrigger>
          <TabsTrigger value="types">Fee types</TabsTrigger>
        </TabsList>
        <TabsContent value="structures"><StructuresTab canManage={canManage} /></TabsContent>
        <TabsContent value="types"><FeeTypesTab canManage={canManage} /></TabsContent>
      </Tabs>
    </>
  );
}
