"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BookOpen, ShieldAlert } from "lucide-react";
import { formatDate, humanize } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudent } from "../hooks";
import { fullName, type StudentEnrollment } from "../types";
import { StatusDialog } from "./status-dialog";

const ENROLLMENT_COLUMNS: Column<StudentEnrollment>[] = [
  { id: "code", header: "Code", cell: (e) => <span className="font-medium">{e.section.course.code}</span> },
  { id: "course", header: "Course", cell: (e) => e.section.course.name },
  { id: "section", header: "Section", cell: (e) => e.section.name },
  {
    id: "semester",
    header: "Semester",
    hideOnMobile: true,
    cell: (e) => `${e.section.semester.semesterNumber} · ${humanize(e.section.semester.type)}`,
  },
  { id: "credits", header: "Credits", align: "center", hideOnMobile: true, cell: (e) => e.section.course.creditHours },
  {
    id: "teacher",
    header: "Teacher",
    hideOnMobile: true,
    cell: (e) => {
      const t = e.section.teachers[0]?.staffProfile;
      return t ? fullName(t) : "—";
    },
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface StudentDetailPageProps {
  id: string;
  basePath: string;
  /** may change the student's status */
  canManage?: boolean;
}

export function StudentDetailPage({ id, basePath, canManage = false }: StudentDetailPageProps) {
  const q = useStudent(id);
  const [statusOpen, setStatusOpen] = useState(false);
  const back = (
    <Button variant="outline" asChild>
      <Link href={`${basePath}/students`}>
        <ArrowLeft aria-hidden="true" /> All students
      </Link>
    </Button>
  );

  if (q.isLoading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <>
        <PageHeader title="Student" actions={back} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load this student" />
      </>
    );
  }

  const s = q.data;
  const p = s.studentProfile;
  const name = fullName(p);

  return (
    <>
      <PageHeader
        title={name}
        description={`${p.registrationNo} · ${p.program.name}`}
        actions={
          <>
            {back}
            {canManage && <Button onClick={() => setStatusOpen(true)}>Change status</Button>}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={p.status} />
        {!s.isActive && (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Login disabled
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Personal information">
          <DetailList
            items={[
              { label: "First name", value: p.firstName },
              { label: "Last name", value: p.lastName },
              { label: "Father's name", value: p.fatherName },
              { label: "Gender", value: p.gender && humanize(p.gender) },
              { label: "Date of birth", value: p.dateOfBirth && formatDate(p.dateOfBirth) },
              { label: "CNIC", value: p.cnic },
              { label: "Phone", value: p.phone },
              { label: "Personal email", value: p.personalEmail },
              { label: "Address", value: p.address },
            ]}
          />
        </Section>

        <div className="space-y-4">
          <Section title="Academic">
            <DetailList
              items={[
                { label: "Registration no.", value: p.registrationNo },
                { label: "Program", value: `${p.program.name} (${p.program.code})` },
                { label: "Department", value: p.program.department.name },
                { label: "Current semester", value: p.currentSemester },
                { label: "Enrolled on", value: formatDate(p.enrollmentDate) },
                { label: "Graduated on", value: p.graduationDate && formatDate(p.graduationDate) },
              ]}
            />
          </Section>
          <Section title="Account">
            <DetailList
              items={[
                { label: "Username", value: s.username },
                { label: "Login email", value: s.email },
                { label: "College email", value: s.collegeEmail },
                { label: "Account created", value: formatDate(s.createdAt) },
              ]}
            />
          </Section>
        </div>
      </div>

      <section aria-labelledby="enrollments-heading" className="mt-6">
        <h2 id="enrollments-heading" className="mb-3 text-base font-semibold">
          Current enrollments
        </h2>
        <DataTable
          caption={`Active enrollments for ${name}`}
          columns={ENROLLMENT_COLUMNS}
          data={p.enrollments}
          getRowId={(e) => e.id}
          empty={{ icon: BookOpen, title: "Not enrolled in any section", description: "Enrollments appear here once the student is placed in course sections." }}
        />
      </section>

      {canManage && <StatusDialog key={p.status} open={statusOpen} onOpenChange={setStatusOpen} studentId={s.id} studentName={name} current={p.status} />}
    </>
  );
}
