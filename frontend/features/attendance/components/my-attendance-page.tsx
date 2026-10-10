"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CircleCheck, CircleX, Clock3, Percent } from "lucide-react";
import { formatDate, formatPercent } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useMyAttendance } from "../hooks";
import { AT_RISK_THRESHOLD, type MyAttendanceRecord } from "../types";

interface CourseRow {
  id: string;
  code: string;
  name: string;
  total: number;
  attended: number;
  absent: number;
  percentage: number;
}

export function MyAttendancePage() {
  const q = useMyAttendance();
  const [courseId, setCourseId] = useState("");

  const courses = useMemo<CourseRow[]>(() => {
    const map = new Map<string, CourseRow>();
    for (const r of q.data?.records ?? []) {
      const s = r.attendanceSession.section;
      const row = map.get(s.id) ?? { id: s.id, code: s.course.code, name: s.course.name, total: 0, attended: 0, absent: 0, percentage: 0 };
      row.total += 1;
      if (r.status === "PRESENT" || r.status === "LATE") row.attended += 1;
      if (r.status === "ABSENT") row.absent += 1;
      map.set(s.id, row);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, percentage: r.total ? Math.round((r.attended / r.total) * 100) : 0 }))
      .sort((a, b) => a.percentage - b.percentage);
  }, [q.data]);

  const records = (q.data?.records ?? []).filter((r) => !courseId || r.attendanceSession.section.id === courseId);
  const s = q.data?.summary;

  const courseColumns: Column<CourseRow>[] = [
    { id: "course", header: "Course", cell: (c) => <div><span className="font-medium tabular-nums">{c.code}</span><p className="text-xs text-muted-foreground">{c.name}</p></div> },
    { id: "classes", header: "Classes", align: "center", hideOnMobile: true, cell: (c) => c.total },
    { id: "attended", header: "Attended", align: "center", hideOnMobile: true, cell: (c) => c.attended },
    { id: "absent", header: "Absent", align: "center", hideOnMobile: true, cell: (c) => c.absent },
    {
      id: "pct",
      header: "Attendance",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-medium tabular-nums">{formatPercent(c.percentage)}</span>
          {c.percentage < AT_RISK_THRESHOLD && <Badge variant="destructive">Below {AT_RISK_THRESHOLD}%</Badge>}
        </div>
      ),
    },
  ];
  const recordColumns: Column<MyAttendanceRecord>[] = [
    { id: "date", header: "Date", cell: (r) => <span className="tabular-nums">{formatDate(r.attendanceSession.date)}</span> },
    { id: "course", header: "Course", cell: (r) => r.attendanceSession.section.course.code },
    { id: "topic", header: "Topic", hideOnMobile: true, cell: (r) => r.attendanceSession.topic ?? "—" },
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { id: "remarks", header: "Remarks", hideOnMobile: true, cell: (r) => r.remarks ?? "—" },
  ];

  return (
    <>
      <PageHeader title="My attendance" description={`Attendance below ${AT_RISK_THRESHOLD}% puts you at risk of being barred from exams.`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Overall attendance" value={s ? formatPercent(s.percentage) : undefined} icon={Percent} tone={s && s.percentage < AT_RISK_THRESHOLD ? "danger" : "success"} description={s ? `${s.total} classes marked` : undefined} loading={q.isLoading} />
        <StatCard title="Present" value={s?.present} icon={CircleCheck} tone="success" loading={q.isLoading} />
        <StatCard title="Absent" value={s?.absent} icon={CircleX} tone="danger" loading={q.isLoading} />
        <StatCard title="Late / excused" value={s ? s.late + s.excused : undefined} icon={Clock3} tone="warning" description={s ? `${s.late} late · ${s.excused} excused` : undefined} loading={q.isLoading} />
      </div>

      <section aria-labelledby="by-course" className="mb-8 space-y-3">
        <h2 id="by-course" className="text-base font-semibold">
          By course
        </h2>
        <DataTable caption="Attendance by course" columns={courseColumns} data={courses} getRowId={(c) => c.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: CalendarCheck, title: "No attendance marked yet", description: "It will appear here once your teachers start marking." }} />
      </section>

      <section aria-labelledby="history" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="history" className="text-base font-semibold">
            Class-by-class
          </h2>
          <Select aria-label="Filter by course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="sm:w-64" disabled={courses.length === 0}>
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>
        <DataTable caption="Attendance records" columns={recordColumns} data={q.isLoading ? undefined : records} getRowId={(r) => r.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: CalendarCheck, title: "No records" }} />
      </section>
    </>
  );
}
