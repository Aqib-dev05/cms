"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert, FilterX, MessageSquareWarning, Plus } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import { reqId, reqText, useZodForm } from "@/lib/form";
import { usePageState } from "@/hooks/use-page-state";
import { useRole } from "@/hooks/use-role";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useComplaintCategories, useComplaints, useComplaintStats, useCreateComplaint } from "../hooks";
import { COMPLAINT_STATUSES, submitterName, type Complaint, type ComplaintStatus } from "../types";

const schema = z.object({
  categoryId: reqId("Choose a category"),
  title: reqText(200).pipe(z.string().min(5, "At least 5 characters")),
  description: reqText(2000).pipe(z.string().min(10, "Please give a bit more detail (10+ characters)")),
});

function NewComplaintDialog({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const categories = useComplaintCategories();
  const create = useCreateComplaint();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useZodForm(schema, { categoryId: "", title: "", description: "" });
  const routed = categories.data?.find((c) => c.id === watch("categoryId"));
  return (
    <FormDialog open onOpenChange={onOpenChange} title="New complaint" description="Your complaint goes straight to the people who can resolve it." onSubmit={handleSubmit((v) => create.mutate(v, { onSuccess: () => onOpenChange(false) }))} isSubmitting={create.isPending} error={create.isError ? getErrorMessage(create.error) : null} submitLabel="Submit complaint">
      <FormField id="cmp-cat" label="Category" required error={errors.categoryId?.message} description={routed ? `Will be handled by: ${humanize(routed.routeToRole)}` : undefined}>
        <Select {...register("categoryId")} disabled={categories.isLoading}>
          <option value="">Select a category</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="cmp-title" label="Subject" required error={errors.title?.message}>
        <Input autoComplete="off" {...register("title")} />
      </FormField>
      <FormField id="cmp-desc" label="What happened?" required error={errors.description?.message}>
        <Textarea rows={5} {...register("description")} />
      </FormField>
    </FormDialog>
  );
}

export function ComplaintsPage() {
  const router = useRouter();
  const { role, basePath } = useRole();
  const isStudent = role === "STUDENT";
  const canSeeStats = role === "ADMIN" || role === "COMPLAINT_OFFICER";
  const { page, limit, setPage, setLimit } = usePageState(20);
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [creating, setCreating] = useState(false);
  const categories = useComplaintCategories();
  const stats = useComplaintStats(canSeeStats);
  const q = useComplaints({ page, limit, status: status || undefined, categoryId: categoryId || undefined });
  const filtersActive = !!(status || categoryId);

  const count = (st: ComplaintStatus) => stats.data?.byStatus.find((s) => s.status === st)?._count.id ?? 0;
  const open = stats.data ? count("SUBMITTED") + count("UNDER_REVIEW") + count("IN_PROGRESS") : undefined;

  const columns: Column<Complaint>[] = [
    { id: "title", header: "Complaint", cell: (c) => <div className="min-w-0"><p className="font-medium">{c.title}</p><p className="text-xs text-muted-foreground">{c.category.name}</p></div> },
    ...(isStudent ? [] : [{ id: "by", header: "Submitted by", hideOnMobile: true, cell: (c: Complaint) => submitterName(c) } as Column<Complaint>]),
    { id: "date", header: "Submitted", hideOnMobile: true, cell: (c) => formatDate(c.createdAt) },
    { id: "comments", header: "Replies", align: "center", hideOnMobile: true, cell: (c) => c._count?.comments ?? 0 },
    { id: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Complaints"
        description={isStudent ? "Raise an issue and follow its progress." : "Track, assign and resolve grievances."}
        actions={isStudent ? <Button onClick={() => setCreating(true)}><Plus aria-hidden="true" /> New complaint</Button> : undefined}
      />
      {canSeeStats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Open" value={open} icon={MessageSquareWarning} tone="warning" loading={stats.isLoading} />
          <StatCard title="Resolved" value={stats.data ? count("RESOLVED") : undefined} tone="success" loading={stats.isLoading} />
          <StatCard title="Waiting over 7 days" value={stats.data?.overdueCount} icon={CircleAlert} tone="danger" loading={stats.isLoading} />
          <StatCard title="Rejected / closed" value={stats.data ? count("REJECTED") + count("CLOSED") : undefined} loading={stats.isLoading} />
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as ComplaintStatus | ""); setPage(1); }} className="sm:w-48">
          <option value="">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="sm:w-56" disabled={categories.isLoading}>
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={() => { setStatus(""); setCategoryId(""); setPage(1); }}>
            <FilterX aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>
      <DataTable
        caption="Complaints"
        columns={columns}
        data={q.data?.data}
        getRowId={(c) => c.id}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        onRowClick={(c) => router.push(`${basePath}/complaints/${c.id}`)}
        empty={{ icon: MessageSquareWarning, title: filtersActive ? "No complaints match" : isStudent ? "You haven't raised any complaints" : "No complaints yet", description: isStudent && !filtersActive ? "If something's wrong, let us know." : undefined }}
        pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }}
      />
      {creating && <NewComplaintDialog onOpenChange={(o) => !o && setCreating(false)} />}
    </>
  );
}
