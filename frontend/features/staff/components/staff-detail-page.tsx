"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BookOpen, ShieldAlert } from "lucide-react";
import { formatDate, humanize } from "@/lib/format";
import { getErrorMessage } from "@/lib/api";
import { DataTable, type Column } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffMember, useUpdateStaffStatus } from "../hooks";
import { STAFF_STATUSES, type StaffAssignment, type StaffStatus } from "../types";

const ASSIGNMENT_COLUMNS: Column<StaffAssignment>[] = [
  { id: "code", header: "Code", cell: (a) => <span className="font-medium">{a.section.course.code}</span> },
  { id: "course", header: "Course", cell: (a) => a.section.course.name },
  { id: "section", header: "Section", cell: (a) => a.section.name },
  { id: "sem", header: "Semester", hideOnMobile: true, cell: (a) => `${a.section.semester.semesterNumber} · ${humanize(a.section.semester.type)}` },
  { id: "role", header: "Role", hideOnMobile: true, cell: (a) => (a.isPrimary ? <Badge variant="info">Primary</Badge> : "Co-teacher") },
  { id: "active", header: "Term", cell: (a) => <StatusBadge status={a.section.semester.isActive ? "ACTIVE" : "CLOSED"} /> },
];

function StatusDialog({ userId, name, current, onOpenChange }: { userId: string; name: string; current: StaffStatus; onOpenChange: (o: boolean) => void }) {
  const options = STAFF_STATUSES.filter((s) => s !== current);
  const [status, setStatus] = useState<StaffStatus>(options[0]);
  const [leavingDate, setLeavingDate] = useState("");
  const update = useUpdateStaffStatus();
  const leaving = status === "RESIGNED" || status === "RETIRED";
  const disables = status === "RESIGNED" || status === "RETIRED" || status === "SUSPENDED";

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="Change staff status"
      description={`${name} is currently ${humanize(current)}.`}
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({ id: userId, status, leavingDate: leaving && leavingDate ? leavingDate : undefined }, { onSuccess: () => onOpenChange(false) });
      }}
      isSubmitting={update.isPending}
      error={update.isError ? getErrorMessage(update.error) : null}
      submitLabel="Update status"
      destructive={disables}
    >
      <div className="space-y-2">
        <Label htmlFor="staff-status">New status</Label>
        <Select id="staff-status" value={status} onChange={(e) => setStatus(e.target.value as StaffStatus)}>
          {options.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <p className="text-sm text-muted-foreground">{disables ? "This also disables the account's login." : status === "ACTIVE" ? "This re-enables the account's login." : "The account keeps working while on leave."}</p>
      </div>
      {leaving && (
        <div className="space-y-2">
          <Label htmlFor="leaving-date">Leaving date (optional)</Label>
          <Input id="leaving-date" type="date" value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} />
        </div>
      )}
    </FormDialog>
  );
}

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

export function StaffDetailPage({ id, basePath, canManage = false }: { id: string; basePath: string; canManage?: boolean }) {
  const q = useStaffMember(id);
  const [statusOpen, setStatusOpen] = useState(false);
  const back = (
    <Button variant="outline" asChild>
      <Link href={`${basePath}/staff`}>
        <ArrowLeft aria-hidden="true" /> All staff
      </Link>
    </Button>
  );

  if (q.isLoading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-9 w-64" />
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
        <PageHeader title="Staff member" actions={back} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load this staff member" />
      </>
    );
  }

  const u = q.data;
  const p = u.staffProfile;
  const name = `${p.firstName} ${p.lastName}`;

  return (
    <>
      <PageHeader
        title={name}
        description={`${u.role.displayName}${p.department ? ` · ${p.department.name}` : ""}`}
        actions={
          <>
            {back}
            {canManage && <Button onClick={() => setStatusOpen(true)}>Change status</Button>}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={p.status} />
        {!u.isActive && (
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
              { label: "Address", value: p.address },
            ]}
          />
        </Section>
        <div className="space-y-4">
          <Section title="Employment">
            <DetailList
              items={[
                { label: "Employee ID", value: p.employeeId },
                { label: "Designation", value: p.designation },
                { label: "Qualification", value: p.qualification },
                { label: "Department", value: p.department?.name },
                { label: "Joined", value: formatDate(p.joiningDate) },
                { label: "Left", value: p.leavingDate && formatDate(p.leavingDate) },
              ]}
            />
          </Section>
          <Section title="Account">
            <DetailList
              items={[
                { label: "Username", value: u.username },
                { label: "Login email", value: u.email },
                { label: "College email", value: u.collegeEmail },
                { label: "Account created", value: formatDate(u.createdAt) },
              ]}
            />
          </Section>
        </div>
      </div>

      <section aria-labelledby="assignments-h" className="mt-6">
        <h2 id="assignments-h" className="mb-3 text-base font-semibold">
          Teaching assignments
        </h2>
        <DataTable
          caption={`Sections taught by ${name}`}
          columns={ASSIGNMENT_COLUMNS}
          data={p.courseTeachers}
          getRowId={(a) => a.sectionId}
          empty={{ icon: BookOpen, title: "No sections assigned", description: "Assign this person to sections from Academic setup." }}
        />
      </section>

      {canManage && statusOpen && <StatusDialog key={p.status} userId={u.id} name={name} current={p.status} onOpenChange={setStatusOpen} />}
    </>
  );
}
