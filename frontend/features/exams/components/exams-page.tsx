"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useWorkableSections } from "@/features/staff/hooks";
import { getErrorMessage } from "@/lib/api";
import { EXAM_TYPES } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import { optDate, optInt, optText, reqNumber, reqText, useZodForm } from "@/lib/form";
import { useRole } from "@/hooks/use-role";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { SectionSelect } from "@/components/shared/section-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateExam, useDeleteExam, useExams, useUpdateExam } from "../hooks";
import type { Exam, ExamType } from "../types";

const schema = z
  .object({
    title: reqText(100).pipe(z.string().min(2, "At least 2 characters")),
    type: z.enum(EXAM_TYPES),
    totalMarks: reqNumber(0),
    passingMarks: reqNumber(0),
    date: optDate,
    duration: optInt(1, 600),
    instructions: optText(1000),
  })
  .refine((v) => v.passingMarks <= v.totalMarks, { path: ["passingMarks"], message: "Passing marks can't exceed total marks" });

function ExamDialog({ sectionId, exam, onOpenChange }: { sectionId: string; exam?: Exam; onOpenChange: (o: boolean) => void }) {
  const create = useCreateExam();
  const update = useUpdateExam();
  const mutation = exam ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    title: exam?.title ?? "",
    type: exam?.type ?? "MIDTERM",
    totalMarks: exam ? String(exam.totalMarks) : "",
    passingMarks: exam ? String(exam.passingMarks) : "",
    date: exam?.date?.slice(0, 10) ?? "",
    duration: exam?.duration ? String(exam.duration) : "",
    instructions: exam?.instructions ?? "",
  });
  const submit = handleSubmit((v) => {
    if (exam) update.mutate({ id: exam.id, ...v }, { onSuccess: () => onOpenChange(false) });
    else create.mutate({ sectionId, ...v }, { onSuccess: () => onOpenChange(false) });
  });
  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title={exam ? "Edit exam" : "New exam"} onSubmit={submit} isSubmitting={mutation.isPending} error={mutation.isError ? getErrorMessage(mutation.error) : null} submitLabel={exam ? "Save changes" : "Create exam"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="exam-title" label="Title" required error={errors.title?.message} className="sm:col-span-2">
          <Input autoComplete="off" placeholder="e.g. Midterm Exam" {...register("title")} />
        </FormField>
        <FormField id="exam-type" label="Type" required error={errors.type?.message}>
          <Select {...register("type")}>
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="exam-date" label="Date" error={errors.date?.message}>
          <Input type="date" {...register("date")} />
        </FormField>
        <FormField id="exam-total" label="Total marks" required error={errors.totalMarks?.message}>
          <Input type="number" inputMode="decimal" step="0.5" min={0} {...register("totalMarks")} />
        </FormField>
        <FormField id="exam-pass" label="Passing marks" required error={errors.passingMarks?.message}>
          <Input type="number" inputMode="decimal" step="0.5" min={0} {...register("passingMarks")} />
        </FormField>
        <FormField id="exam-duration" label="Duration (minutes)" error={errors.duration?.message}>
          <Input type="number" inputMode="numeric" min={1} {...register("duration")} />
        </FormField>
        <FormField id="exam-instr" label="Instructions" error={errors.instructions?.message} className="sm:col-span-2">
          <Textarea {...register("instructions")} />
        </FormField>
      </div>
    </FormDialog>
  );
}

export function ExamsPage() {
  const { role, basePath } = useRole();
  const canCreate = role === "ADMIN";
  const canManage = role === "ADMIN" || role === "HOD";
  const { sections, isLoading } = useWorkableSections();
  const [sectionId, setSectionId] = useState("");
  const q = useExams({ sectionId }, !!sectionId);
  const remove = useDeleteExam();
  const [editing, setEditing] = useState<Exam | "new" | null>(null);
  const [deleting, setDeleting] = useState<Exam | null>(null);

  const columns: Column<Exam>[] = [
    { id: "title", header: "Exam", cell: (e) => <div><p className="font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{humanize(e.type as ExamType)}</p></div> },
    { id: "date", header: "Date", hideOnMobile: true, cell: (e) => (e.date ? formatDate(e.date) : "—") },
    { id: "marks", header: "Marks", align: "center", hideOnMobile: true, cell: (e) => <span className="tabular-nums">{e.totalMarks} (pass {e.passingMarks})</span> },
    { id: "results", header: "Results", align: "center", cell: (e) => e._count.results },
    { id: "status", header: "Status", cell: (e) => <StatusBadge status={e.isPublished ? "PUBLISHED" : "DRAFT"} /> },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (e) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`${basePath}/exams/${e.id}`}>{e.isPublished ? "View" : "Enter results"}</Link>
          </Button>
          {canManage && !e.isPublished && (
            <>
              <Button variant="ghost" size="icon" aria-label={`Edit ${e.title}`} onClick={() => setEditing(e)}>
                <Pencil aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${e.title}`} onClick={() => setDeleting(e)}>
                <Trash2 className="text-destructive" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Exams & grades"
        description="Create assessments, enter marks and publish results."
        actions={
          canCreate && sectionId ? (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" /> New exam
            </Button>
          ) : undefined
        }
      />
      <div className="mb-6 max-w-xl space-y-2">
        <Label htmlFor="exam-section">Section</Label>
        <SectionSelect id="exam-section" sections={isLoading ? [] : sections} value={sectionId} onChange={setSectionId} activeOnly={false} placeholder={isLoading ? "Loading sections…" : "Select a section"} />
      </div>
      {!sectionId ? (
        <EmptyState icon={Award} title="Choose a section" description="Pick a section to see its exams." />
      ) : (
        <DataTable caption="Exams" columns={columns} data={q.data} getRowId={(e) => e.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: Award, title: "No exams yet", description: canCreate ? "Create the first exam for this section." : "Exams are created by the administration." }} />
      )}
      {editing && sectionId && <ExamDialog key={editing === "new" ? "new" : editing.id} sectionId={sectionId} exam={editing === "new" ? undefined : editing} onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete this exam?" description={deleting ? `"${deleting.title}" and any marks entered for it will be removed.` : undefined} confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })} />
    </>
  );
}
