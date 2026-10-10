"use client";

import { useState } from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useDepartments, usePrograms } from "@/features/academic/hooks";
import { getErrorMessage } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import { optDate, optText, reqText, useZodForm } from "@/lib/form";
import { usePageState } from "@/hooks/use-page-state";
import { useRole } from "@/hooks/use-role";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RoleName } from "@/types";
import { useCreateNotice, useDeleteNotice, useNotices, useUpdateNotice } from "../hooks";
import { NOTICE_AUDIENCES, authorName, type Notice } from "../types";

const schema = z.object({
  title: reqText(200).pipe(z.string().min(3, "At least 3 characters")),
  category: optText(50),
  audience: z.enum(NOTICE_AUDIENCES),
  departmentId: z.string().optional(),
  programId: z.string().optional(),
  content: reqText(5000).pipe(z.string().min(10, "At least 10 characters")),
  expiresAt: optDate,
});

/** The list endpoint doesn't filter by audience, so hide notices clearly meant for someone else. */
export const visibleTo = (role: RoleName | null, n: Notice) => (role === "STUDENT" ? n.audience !== "STAFF" : role === "ADMIN" ? true : n.audience !== "STUDENTS");

function NoticeDialog({ notice, onOpenChange }: { notice?: Notice; onOpenChange: (o: boolean) => void }) {
  const departments = useDepartments();
  const programs = usePrograms();
  const create = useCreateNotice();
  const update = useUpdateNotice();
  const mutation = notice ? update : create;
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useZodForm(schema, { title: notice?.title ?? "", category: notice?.category ?? "", audience: notice?.audience ?? "ALL", departmentId: notice?.departmentId ?? "", programId: notice?.programId ?? "", content: notice?.content ?? "", expiresAt: notice?.expiresAt?.slice(0, 10) ?? "" });
  const audience = watch("audience");

  const submit = handleSubmit((v) => {
    if (v.audience === "DEPARTMENT" && !v.departmentId) return setError("departmentId", { message: "Choose a department" });
    if (v.audience === "PROGRAM" && !v.programId) return setError("programId", { message: "Choose a program" });
    const body = { title: v.title, content: v.content, category: v.category, audience: v.audience, expiresAt: v.expiresAt, departmentId: v.audience === "DEPARTMENT" ? v.departmentId : undefined, programId: v.audience === "PROGRAM" ? v.programId : undefined };
    if (notice) update.mutate({ id: notice.id, ...body }, { onSuccess: () => onOpenChange(false) });
    else create.mutate(body, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title={notice ? "Edit notice" : "New notice"} description={notice ? undefined : "Notices are published as soon as you save."} onSubmit={submit} isSubmitting={mutation.isPending} error={mutation.isError ? getErrorMessage(mutation.error) : null} submitLabel={notice ? "Save changes" : "Publish notice"}>
      <FormField id="nt-title" label="Title" required error={errors.title?.message}><Input autoComplete="off" {...register("title")} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="nt-aud" label="Audience" required error={errors.audience?.message}>
          <Select {...register("audience")}>
            {NOTICE_AUDIENCES.map((a) => (
              <option key={a} value={a}>{humanize(a)}</option>
            ))}
          </Select>
        </FormField>
        <FormField id="nt-cat" label="Category" error={errors.category?.message}><Input autoComplete="off" placeholder="e.g. Exams, Holiday" {...register("category")} /></FormField>
        {audience === "DEPARTMENT" && (
          <FormField id="nt-dept" label="Department" required error={errors.departmentId?.message}>
            <Select {...register("departmentId")} disabled={departments.isLoading}>
              <option value="">Select department</option>
              {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </FormField>
        )}
        {audience === "PROGRAM" && (
          <FormField id="nt-prog" label="Program" required error={errors.programId?.message}>
            <Select {...register("programId")} disabled={programs.isLoading}>
              <option value="">Select program</option>
              {programs.data?.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </Select>
          </FormField>
        )}
        <FormField id="nt-exp" label="Expires on" description="Optional" error={errors.expiresAt?.message}><Input type="date" {...register("expiresAt")} /></FormField>
      </div>
      <FormField id="nt-content" label="Message" required error={errors.content?.message}><Textarea rows={7} {...register("content")} /></FormField>
    </FormDialog>
  );
}

export function NoticesPage() {
  const { role } = useRole();
  const canCreate = role === "ADMIN" || role === "HOD";
  const canManage = role === "ADMIN";
  const { page, limit, setPage, setLimit } = usePageState(10);
  const q = useNotices({ page, limit, active: true });
  const remove = useDeleteNotice();
  const [reading, setReading] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);

  const rows = q.data?.data.filter((n) => visibleTo(role, n));
  const columns: Column<Notice>[] = [
    { id: "title", header: "Notice", cell: (n) => <div className="min-w-0"><p className="font-medium">{n.title}</p><p className="line-clamp-1 text-xs text-muted-foreground">{n.content}</p></div> },
    { id: "cat", header: "Category", hideOnMobile: true, cell: (n) => (n.category ? <Badge variant="outline">{n.category}</Badge> : "—") },
    { id: "aud", header: "For", hideOnMobile: true, cell: (n) => humanize(n.audience) },
    { id: "date", header: "Published", cell: (n) => (n.publishedAt ? formatDate(n.publishedAt) : "—") },
  ];
  if (canManage) columns.push({ id: "actions", header: "", align: "right", cell: (n) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Edit ${n.title}`} onClick={(e) => { e.stopPropagation(); setEditing(n); }}><Pencil aria-hidden="true" /></Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${n.title}`} onClick={(e) => { e.stopPropagation(); setDeleting(n); }}><Trash2 className="text-destructive" aria-hidden="true" /></Button>
    </div>
  ) });

  return (
    <>
      <PageHeader title="Notices" description="Announcements from the college." actions={canCreate ? <Button onClick={() => setEditing("new")}><Plus aria-hidden="true" /> New notice</Button> : undefined} />
      <DataTable caption="Notices" columns={columns} data={rows} getRowId={(n) => n.id} isLoading={q.isLoading} isFetching={q.isFetching} isError={q.isError} error={q.error} onRetry={() => q.refetch()} onRowClick={setReading} empty={{ icon: Megaphone, title: "No notices right now", description: "New announcements will show up here." }} pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }} />
      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent size="lg">
          {reading && (
            <>
              <DialogHeader>
                <DialogTitle>{reading.title}</DialogTitle>
                <DialogDescription>{reading.publishedAt ? formatDate(reading.publishedAt) : ""} · {authorName(reading)}{reading.category ? ` · ${reading.category}` : ""}</DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{reading.content}</p>
              {reading.expiresAt && <p className="text-xs text-muted-foreground">Valid until {formatDate(reading.expiresAt)}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
      {editing && <NoticeDialog key={editing === "new" ? "new" : editing.id} notice={editing === "new" ? undefined : editing} onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete this notice?" description={deleting ? `"${deleting.title}" will disappear for everyone.` : undefined} confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })} />
    </>
  );
}
