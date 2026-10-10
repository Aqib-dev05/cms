"use client";

import Link from "next/link";
import { School } from "lucide-react";
import { useWorkload } from "@/features/staff/hooks";
import type { WorkloadSection } from "@/features/staff/types";
import { humanize } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

export function MyClassesPage() {
  const { basePath } = useRole();
  const q = useWorkload("me");
  const columns: Column<WorkloadSection>[] = [
    { id: "course", header: "Course", cell: (s) => <div><p className="font-medium">{s.course.name}</p><p className="text-xs text-muted-foreground tabular-nums">{s.course.code} · {s.course.creditHours} credit hrs</p></div> },
    { id: "section", header: "Section", cell: (s) => s.name },
    { id: "sem", header: "Semester", hideOnMobile: true, cell: (s) => `${s.semester.semesterNumber} · ${humanize(s.semester.type)}` },
    { id: "students", header: "Students", align: "center", cell: (s) => <span className="tabular-nums">{s._count.enrollments} / {s.capacity}</span> },
    { id: "held", header: "Classes held", align: "center", hideOnMobile: true, cell: (s) => s._count.attendanceSessions },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: () => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" asChild><Link href={`${basePath}/attendance`}>Attendance</Link></Button>
          <Button variant="ghost" size="sm" asChild><Link href={`${basePath}/exams`}>Exams</Link></Button>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="My classes" description="Sections you teach this term." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title="Sections" value={q.data?.totalSections} icon={School} loading={q.isLoading} />
        <StatCard title="Credit hours" value={q.data?.totalCreditHours} loading={q.isLoading} />
      </div>
      <DataTable caption="My classes" columns={columns} data={q.data?.sections} getRowId={(s) => s.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: School, title: "No classes assigned", description: "The administration assigns teachers to sections from Academic setup." }} />
    </>
  );
}
