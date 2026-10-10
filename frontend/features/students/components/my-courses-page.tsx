"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, User } from "lucide-react";
import { humanize } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyProfile } from "../api";

export function MyCoursesPage() {
  const q = useQuery({ queryKey: ["students", "me"], queryFn: fetchMyProfile });
  const enrollments = q.data?.studentProfile.enrollments ?? [];
  const credits = enrollments.reduce((s, e) => s + e.section.course.creditHours, 0);
  const sem = q.data?.studentProfile.currentSemester;

  return (
    <>
      <PageHeader title="My courses" description={q.data ? `${q.data.studentProfile.program.name}${sem ? ` · Semester ${sem}` : ""}` : "Courses you're enrolled in this term."} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title="Enrolled courses" value={q.data ? enrollments.length : undefined} icon={BookOpen} loading={q.isLoading} />
        <StatCard title="Credit hours" value={q.data ? credits : undefined} icon={GraduationCap} loading={q.isLoading} />
      </div>
      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : enrollments.length === 0 ? (
        <EmptyState icon={BookOpen} title="You're not enrolled in any course yet" description="Once the administration enrolls you in sections, they will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enrollments.map((e) => {
            const teacher = e.section.teachers[0]?.staffProfile;
            return (
              <Card key={e.id}>
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{e.section.course.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">{e.section.course.code}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Section {e.section.name} · Semester {e.section.semester.semesterNumber} ({humanize(e.section.semester.type)}) · {e.section.course.creditHours} credit hrs</p>
                </CardHeader>
                <CardContent>
                  <p className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{teacher ? `${teacher.firstName} ${teacher.lastName}` : <span className="text-muted-foreground">Teacher not assigned yet</span>}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
