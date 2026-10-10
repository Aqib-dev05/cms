"use client";

import { useMemo, useState } from "react";
import { Award, FileDown, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { fetchMyProfile } from "@/features/students/api";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api";
import { openPdf } from "@/lib/api-helpers";
import { formatDate, formatPercent, humanize } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyGrades } from "../hooks";

export function MyResultsPage() {
  const grades = useMyGrades();
  const profile = useQuery({ queryKey: ["students", "me"], queryFn: fetchMyProfile });
  const [semesterId, setSemesterId] = useState("");
  const [downloading, setDownloading] = useState(false);

  // semesters the student is enrolled in → report-card choices
  const semesters = useMemo(() => {
    const map = new Map<string, string>();
    for (const en of profile.data?.studentProfile.enrollments ?? []) {
      if (en.section.semesterId) map.set(en.section.semesterId, `Semester ${en.section.semester.semesterNumber} · ${humanize(en.section.semester.type)}`);
    }
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [profile.data]);

  const download = async () => {
    const id = semesterId || semesters[0]?.id;
    if (!id) return;
    setDownloading(true);
    try {
      await openPdf(`/pdf/report-card/me/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const g = grades.data;
  return (
    <>
      <PageHeader
        title="Results"
        description="Published marks and grades."
        actions={
          semesters.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {semesters.length > 1 && (
                <Select aria-label="Semester for the report card" value={semesterId || semesters[0].id} onChange={(e) => setSemesterId(e.target.value)} className="w-52">
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              )}
              <Button variant="outline" onClick={download} loading={downloading}>
                <FileDown aria-hidden="true" /> Report card (PDF)
              </Button>
            </div>
          ) : undefined
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title="Overall percentage" value={g ? formatPercent(g.overallPercentage) : undefined} icon={GraduationCap} loading={grades.isLoading} />
        <StatCard title="Overall grade" value={g?.overallGrade} icon={Award} tone="success" loading={grades.isLoading} />
      </div>

      {grades.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : grades.isError ? (
        <ErrorState error={grades.error} onRetry={() => grades.refetch()} />
      ) : !g || g.courses.length === 0 ? (
        <EmptyState icon={Award} title="No published results yet" description="Results appear here as soon as your teachers publish them." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {g.courses.map((c) => (
            <Card key={c.course.code}>
              <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{c.course.code} · {c.course.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{c.course.creditHours} credit hours</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-xl font-semibold tabular-nums">{c.grade}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatPercent(c.percentage)}</p>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {c.exams.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{r.exam.title}</p>
                        <p className="text-xs text-muted-foreground">{humanize(r.exam.type)}{r.exam.date ? ` · ${formatDate(r.exam.date)}` : ""}</p>
                      </div>
                      {r.isAbsent ? <Badge variant="destructive">Absent</Badge> : <span className="shrink-0 tabular-nums">{r.marksObtained} / {r.exam.totalMarks}</span>}
                    </li>
                  ))}
                </ul>
                {!c.isPassing && <Badge variant="destructive" className="mt-3">Below passing</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
