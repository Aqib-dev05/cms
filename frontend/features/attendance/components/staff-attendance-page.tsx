"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, ClipboardList, TriangleAlert } from "lucide-react";
import { useWorkableSections } from "@/features/staff/hooks";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatPercent } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionSelect } from "@/components/shared/section-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAttendanceSession, useMarkAttendance, useSectionSessions, useSectionSummary, useUpdateRecord } from "../hooks";
import { AT_RISK_THRESHOLD, type AttendanceSessionListItem, type AttendanceStatus, type SectionSummaryRow } from "../types";
import { StatusToggle } from "./status-toggle";

const todayISO = () => new Date().toISOString().slice(0, 10);

function MarkTab({ sectionId, onSaved }: { sectionId: string; onSaved: () => void }) {
  const summary = useSectionSummary(sectionId);
  const mark = useMarkAttendance();
  const [date, setDate] = useState(todayISO());
  const [topic, setTopic] = useState("");
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [error, setError] = useState<string | null>(null);

  const roster = summary.data?.students ?? [];
  const sorted = useMemo(() => [...roster].sort((a, b) => a.student.registrationNo.localeCompare(b.student.registrationNo)), [roster]);
  const statusOf = (id: string): AttendanceStatus => statuses[id] ?? "PRESENT";
  const counts = sorted.reduce<Record<AttendanceStatus, number>>((acc, r) => ({ ...acc, [statusOf(r.student.id)]: acc[statusOf(r.student.id)] + 1 }), { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 });

  if (summary.isLoading) return <Skeleton className="h-64" />;
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;
  if (sorted.length === 0) return <EmptyState icon={ClipboardList} title="No students enrolled" description="Enroll students in this section first (Students → student → enroll)." />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mark.mutate(
      { sectionId, date, topic: topic.trim() || undefined, records: sorted.map((r) => ({ studentProfileId: r.student.id, status: statusOf(r.student.id) })) },
      {
        onSuccess: () => {
          setStatuses({});
          setTopic("");
          onSaved();
        },
        onError: (err) => setError(getErrorMessage(err)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-2">
          <Label htmlFor="att-date">Date</Label>
          <Input id="att-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="att-topic">Topic (optional)</Label>
          <Input id="att-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder="What was covered today?" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {counts.PRESENT} present · {counts.ABSENT} absent · {counts.LATE} late · {counts.EXCUSED} excused
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setStatuses({})}>
            All present
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setStatuses(Object.fromEntries(sorted.map((r) => [r.student.id, "ABSENT" as const])))}>
            All absent
          </Button>
        </div>
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        {sorted.map((r) => {
          const name = `${r.student.firstName} ${r.student.lastName}`;
          return (
            <li key={r.student.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{r.student.registrationNo}</p>
              </div>
              <StatusToggle label={name} value={statusOf(r.student.id)} onChange={(v) => setStatuses((s) => ({ ...s, [r.student.id]: v }))} />
            </li>
          );
        })}
      </ul>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}. If it was already marked for this date, fix individual records from the History tab.</span>
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={mark.isPending} disabled={!date}>
          Save attendance
        </Button>
      </div>
    </form>
  );
}

function SessionDialog({ sessionId, onOpenChange }: { sessionId: string; onOpenChange: (o: boolean) => void }) {
  const q = useAttendanceSession(sessionId);
  const update = useUpdateRecord();
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{q.data ? `${q.data.section.course.code} · ${formatDate(q.data.date)}` : "Attendance session"}</DialogTitle>
          <DialogDescription>{q.data?.topic ?? "Tap a letter to correct a record — it saves immediately."}</DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <Skeleton className="h-48" />
        ) : q.isError || !q.data ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <ul className="divide-y rounded-lg border">
            {q.data.records.map((r) => {
              const name = `${r.studentProfile.firstName} ${r.studentProfile.lastName}`;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{r.studentProfile.registrationNo}</p>
                  </div>
                  <StatusToggle label={name} value={r.status} disabled={update.isPending} onChange={(status) => status !== r.status && update.mutate({ recordId: r.id, status })} />
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryTab({ sectionId }: { sectionId: string }) {
  const q = useSectionSessions(sectionId);
  const [openId, setOpenId] = useState<string | null>(null);
  const columns: Column<AttendanceSessionListItem>[] = [
    { id: "date", header: "Date", cell: (s) => <span className="font-medium tabular-nums">{formatDate(s.date)}</span> },
    { id: "topic", header: "Topic", hideOnMobile: true, cell: (s) => s.topic ?? "—" },
    { id: "records", header: "Students marked", align: "center", cell: (s) => s._count.records },
  ];
  return (
    <>
      <DataTable caption="Attendance sessions" columns={columns} data={q.data} getRowId={(s) => s.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} onRowClick={(s) => setOpenId(s.id)} empty={{ icon: CalendarCheck, title: "Nothing marked yet", description: "Sessions you mark will be listed here." }} />
      {openId && <SessionDialog sessionId={openId} onOpenChange={(o) => !o && setOpenId(null)} />}
    </>
  );
}

function SummaryTab({ sectionId }: { sectionId: string }) {
  const q = useSectionSummary(sectionId);
  const rows = [...(q.data?.students ?? [])].sort((a, b) => a.percentage - b.percentage);
  const columns: Column<SectionSummaryRow>[] = [
    { id: "name", header: "Student", cell: (r) => <div><p className="font-medium">{r.student.firstName} {r.student.lastName}</p><p className="text-xs text-muted-foreground tabular-nums">{r.student.registrationNo}</p></div> },
    { id: "present", header: "Present", align: "center", hideOnMobile: true, cell: (r) => r.present },
    { id: "late", header: "Late", align: "center", hideOnMobile: true, cell: (r) => r.late },
    { id: "absent", header: "Absent", align: "center", hideOnMobile: true, cell: (r) => r.absent },
    {
      id: "pct",
      header: "Attendance",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-medium tabular-nums">{formatPercent(r.percentage)}</span>
          {r.totalSessions > 0 && r.isAtRisk && <Badge variant="destructive">At risk</Badge>}
        </div>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {q.data ? `${q.data.totalSessions} classes held. ` : ""}Students below {AT_RISK_THRESHOLD}% are flagged.
      </p>
      <DataTable caption="Attendance summary" columns={columns} data={q.data ? rows : undefined} getRowId={(r) => r.student.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: ClipboardList, title: "No students enrolled" }} />
    </div>
  );
}

export function StaffAttendancePage() {
  const { sections, isLoading, isError } = useWorkableSections();
  const [sectionId, setSectionId] = useState("");
  const [tab, setTab] = useState("mark");
  return (
    <>
      <PageHeader title="Attendance" description="Mark today's class, fix past records and spot students at risk." />
      <div className="mb-6 max-w-xl space-y-2">
        <Label htmlFor="att-section">Section</Label>
        <SectionSelect id="att-section" sections={isLoading ? [] : sections} value={sectionId} onChange={setSectionId} activeOnly={false} placeholder={isLoading ? "Loading sections…" : "Select a section"} />
        {isError && <p className="text-sm text-destructive">Couldn't load your sections.</p>}
      </div>
      {!sectionId ? (
        <EmptyState icon={CalendarCheck} title="Choose a section" description={sections.length === 0 && !isLoading ? "You have no sections assigned yet." : "Pick one of your sections to begin."} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Attendance views">
            <TabsTrigger value="mark">Mark attendance</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="mark">
            <MarkTab key={sectionId} sectionId={sectionId} onSaved={() => setTab("history")} />
          </TabsContent>
          <TabsContent value="history">
            <HistoryTab sectionId={sectionId} />
          </TabsContent>
          <TabsContent value="summary">
            <SummaryTab sectionId={sectionId} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
