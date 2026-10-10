"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Lock, Send, TriangleAlert, Users } from "lucide-react";
import { useSectionSummary } from "@/features/attendance/hooks";
import { getErrorMessage } from "@/lib/api";
import { formatDate, humanize } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExam, useExamSummary, usePublishResults, useSaveResults } from "../hooks";
import type { ExamType } from "../types";

interface Draft {
  marks: string;
  absent: boolean;
}

export function ExamDetailPage({ id }: { id: string }) {
  const { role, basePath } = useRole();
  const canPublish = role === "ADMIN" || role === "HOD";
  const exam = useExam(id);
  const sectionId = exam.data?.sectionId ?? "";
  // The roster comes from the section summary (every actively enrolled student), so students
  // without a result yet still get a row.
  const roster = useSectionSummary(sectionId);
  const summary = useExamSummary(id, !!exam.data && exam.data.results.length > 0);
  const save = useSaveResults();
  const publish = usePublishResults();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const existing = useMemo(() => new Map((exam.data?.results ?? []).map((r) => [r.studentProfileId, r])), [exam.data]);
  const rows = useMemo(() => [...(roster.data?.students ?? [])].sort((a, b) => a.student.registrationNo.localeCompare(b.student.registrationNo)), [roster.data]);

  const back = (
    <Button variant="outline" asChild>
      <Link href={`${basePath}/exams`}>
        <ArrowLeft aria-hidden="true" /> All exams
      </Link>
    </Button>
  );

  if (exam.isLoading) return <div aria-busy="true" className="space-y-4"><Skeleton className="h-9 w-72" /><Skeleton className="h-64" /></div>;
  if (exam.isError || !exam.data) return <><PageHeader title="Exam" actions={back} /><ErrorState error={exam.error} onRetry={() => exam.refetch()} title="Couldn't load this exam" /></>;

  const e = exam.data;
  const locked = e.isPublished;
  const valueOf = (profileId: string): Draft => {
    const d = drafts[profileId];
    if (d) return d;
    const r = existing.get(profileId);
    return r ? { marks: String(r.marksObtained), absent: r.isAbsent } : { marks: "", absent: false };
  };
  const set = (profileId: string, patch: Partial<Draft>) => setDrafts((s) => ({ ...s, [profileId]: { ...valueOf(profileId), ...patch } }));

  const invalid = (d: Draft) => !d.absent && d.marks !== "" && (Number.isNaN(Number(d.marks)) || Number(d.marks) < 0 || Number(d.marks) > e.totalMarks);
  const filled = rows.filter((r) => { const d = valueOf(r.student.id); return d.absent || d.marks !== ""; });
  const anyInvalid = rows.some((r) => invalid(valueOf(r.student.id)));
  const dirty = Object.keys(drafts).length > 0;

  const onSave = () => {
    setError(null);
    save.mutate(
      { id, results: filled.map((r) => { const d = valueOf(r.student.id); return { studentProfileId: r.student.id, marksObtained: d.absent ? 0 : Number(d.marks), isAbsent: d.absent }; }) },
      { onSuccess: () => setDrafts({}), onError: (err) => setError(getErrorMessage(err)) }
    );
  };

  const stats = summary.data?.stats;
  return (
    <>
      <PageHeader title={e.title} description={`${e.section.course.code} · Section ${e.section.name} — ${humanize(e.type as ExamType)}${e.date ? ` · ${formatDate(e.date)}` : ""}`} actions={back} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={e.isPublished ? "PUBLISHED" : "DRAFT"} />
        <span className="text-sm text-muted-foreground tabular-nums">Total {e.totalMarks} · Passing {e.passingMarks}{e.duration ? ` · ${e.duration} min` : ""}</span>
      </div>

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Average" value={stats.average} description={`of ${e.totalMarks}`} />
          <StatCard title="Highest / lowest" value={`${stats.highest} / ${stats.lowest}`} />
          <StatCard title="Pass rate" value={`${stats.passRate}%`} tone={stats.passRate >= 50 ? "success" : "danger"} description={`${stats.passing} passed · ${stats.failing} failed`} />
          <StatCard title="Absent" value={stats.absent} tone="warning" />
        </div>
      )}

      {locked && (
        <div className="mb-4 flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Results are published, so marks can no longer be edited.</span>
        </div>
      )}

      {roster.isLoading ? (
        <Skeleton className="h-64" />
      ) : roster.isError ? (
        <ErrorState error={roster.error} onRetry={() => roster.refetch()} title="Couldn't load the class list" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No students enrolled in this section" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Marks for {e.title}</caption>
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Student</th>
                <th scope="col" className="px-4 py-3">Marks (out of {e.totalMarks})</th>
                <th scope="col" className="px-4 py-3">Absent</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const d = valueOf(r.student.id);
                const bad = invalid(d);
                const name = `${r.student.firstName} ${r.student.lastName}`;
                return (
                  <tr key={r.student.id}>
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{r.student.registrationNo}</p>
                    </th>
                    <td className="px-4 py-2">
                      <Input aria-label={`Marks for ${name}`} aria-invalid={bad || undefined} type="number" inputMode="decimal" step="0.5" min={0} max={e.totalMarks} value={d.absent ? "" : d.marks} disabled={locked || d.absent} onChange={(ev) => set(r.student.id, { marks: ev.target.value })} className="w-28" />
                      {bad && <p role="alert" className="mt-1 text-xs text-destructive">0 – {e.totalMarks} only</p>}
                    </td>
                    <td className="px-4 py-2">
                      <Checkbox aria-label={`${name} was absent`} checked={d.absent} disabled={locked} onChange={(ev) => set(r.student.id, { absent: ev.target.checked })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!locked && rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">{filled.length} of {rows.length} entered</p>
          <div className="flex gap-2">
            <Button onClick={onSave} loading={save.isPending} disabled={!dirty || anyInvalid || filled.length === 0}>Save marks</Button>
            {canPublish && (
              <Button variant="outline" onClick={() => setConfirmPublish(true)} disabled={dirty || e.results.length === 0}>
                <Send aria-hidden="true" /> Publish results
              </Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish these results?"
        description="Students will see their marks immediately and the marks can no longer be edited."
        confirmLabel="Publish"
        loading={publish.isPending}
        onConfirm={() => publish.mutate(id, { onSuccess: () => setConfirmPublish(false) })}
      />
    </>
  );
}
