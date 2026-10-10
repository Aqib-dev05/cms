"use client";

import Link from "next/link";
import { Award, BookMarked, CalendarCheck, CircleAlert, MessageSquareWarning, Percent, School, Wallet } from "lucide-react";
import { useMyAttendance } from "@/features/attendance/hooks";
import { useComplaints, useComplaintStats } from "@/features/complaints/hooks";
import { COMPLAINT_STATUSES, submitterName } from "@/features/complaints/types";
import { useMyGrades } from "@/features/exams/hooks";
import { useFinanceSummary, useInvoices, useMyFinance } from "@/features/finance/hooks";
import { useActiveIssues, useBooks, useOverdueIssues } from "@/features/library/hooks";
import { useWorkload } from "@/features/staff/hooks";
import { useMyTeachingTimetable, useMyTimetable } from "@/features/timetable/hooks";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { QuickAccess } from "./quick-access";
import { LatestNotices, TodaysClasses } from "./widgets";

function Shell({ children, description }: { children: React.ReactNode; description?: string }) {
  const user = useAppSelector(selectUser);
  return (
    <>
      <PageHeader title={`Welcome back, ${user?.username ?? ""}`} description={description ?? `Signed in as ${user?.role.displayName ?? ""}`} />
      {children}
      <QuickAccess />
    </>
  );
}

export function StudentDashboard() {
  const attendance = useMyAttendance();
  const finance = useMyFinance();
  const grades = useMyGrades();
  const timetable = useMyTimetable();
  const pct = attendance.data?.summary.percentage;
  const due = finance.data?.summary.totalDue;
  return (
    <Shell>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Attendance" value={attendance.data ? formatPercent(pct) : undefined} icon={Percent} tone={pct !== undefined && pct < 75 ? "danger" : "success"} description={attendance.data ? (attendance.data.summary.total ? `${attendance.data.summary.total} classes marked` : "Nothing marked yet") : undefined} loading={attendance.isLoading} />
        <StatCard title="Overall grade" value={grades.data ? (grades.data.courses.length ? grades.data.overallGrade : "—") : undefined} icon={Award} description={grades.data?.courses.length ? formatPercent(grades.data.overallPercentage) : "No published results yet"} loading={grades.isLoading} />
        <StatCard title="Fee balance" value={due !== undefined ? formatCurrency(due) : undefined} icon={Wallet} tone={due ? "warning" : "success"} description={due === 0 ? "All paid up" : undefined} loading={finance.isLoading} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TodaysClasses entries={timetable.data} loading={timetable.isLoading} />
        <LatestNotices />
      </div>
    </Shell>
  );
}

export function TeachingDashboard() {
  const workload = useWorkload("me");
  const timetable = useMyTeachingTimetable();
  const students = workload.data?.sections.reduce((s, x) => s + x._count.enrollments, 0);
  return (
    <Shell>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="My sections" value={workload.data?.totalSections} icon={School} loading={workload.isLoading} />
        <StatCard title="Students" value={students} icon={CalendarCheck} loading={workload.isLoading} />
        <StatCard title="Credit hours" value={workload.data?.totalCreditHours} loading={workload.isLoading} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TodaysClasses entries={timetable.data} loading={timetable.isLoading} />
        <LatestNotices />
      </div>
    </Shell>
  );
}

export function FinanceDashboard() {
  const { role, basePath } = useRole();
  const head = role === "HEAD_CLERK";
  const summary = useFinanceSummary(head);
  const recent = useInvoices({ page: 1, limit: 5 });
  const s = summary.data;
  return (
    <Shell>
      {head && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard title="Total collected" value={s ? formatCurrency(s.totalCollected) : undefined} icon={Wallet} tone="success" loading={summary.isLoading} />
          <StatCard title="Outstanding" value={s ? formatCurrency(s.totalDue) : undefined} tone="warning" loading={summary.isLoading} />
          <StatCard title="Overdue invoices" value={s?.overdueCount} icon={CircleAlert} tone="danger" loading={summary.isLoading} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Latest invoices</CardTitle>
            <Link href={`${basePath}/invoices`} className="text-sm text-primary underline-offset-4 hover:underline">All invoices</Link>
          </CardHeader>
          <CardContent>
            {recent.isLoading ? <Skeleton className="h-24" /> : recent.isError ? <p role="alert" className="text-sm text-destructive">Couldn't load invoices.</p> : (recent.data?.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : (
              <ul className="divide-y">
                {recent.data!.data.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0"><Link href={`${basePath}/invoices/${i.id}`} className="font-medium tabular-nums underline-offset-4 hover:underline">{i.invoiceNo}</Link><p className="truncate text-xs text-muted-foreground">{i.studentProfile ? `${i.studentProfile.firstName} ${i.studentProfile.lastName}` : ""}</p></div>
                    <div className="flex items-center gap-3"><span className="tabular-nums">{formatCurrency(i.dueAmount)}</span><StatusBadge status={i.status} /></div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <LatestNotices />
      </div>
    </Shell>
  );
}

export function LibrarianDashboard() {
  const books = useBooks({ page: 1, limit: 1 });
  const active = useActiveIssues({ page: 1, limit: 1 });
  const overdue = useOverdueIssues();
  return (
    <Shell>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Books in catalogue" value={books.data?.meta.total} icon={BookMarked} loading={books.isLoading} />
        <StatCard title="Currently issued" value={active.data?.meta.total} icon={CalendarCheck} loading={active.isLoading} />
        <StatCard title="Overdue" value={overdue.data?.length} icon={CircleAlert} tone={overdue.data?.length ? "danger" : "success"} loading={overdue.isLoading} />
      </div>
      <LatestNotices />
    </Shell>
  );
}

export function ComplaintOfficerDashboard() {
  const { basePath } = useRole();
  const stats = useComplaintStats();
  const recent = useComplaints({ page: 1, limit: 5 });
  const count = (st: (typeof COMPLAINT_STATUSES)[number]) => stats.data?.byStatus.find((s) => s.status === st)?._count.id ?? 0;
  return (
    <Shell>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="New" value={stats.data ? count("SUBMITTED") : undefined} icon={MessageSquareWarning} tone="info" loading={stats.isLoading} />
        <StatCard title="In progress" value={stats.data ? count("UNDER_REVIEW") + count("IN_PROGRESS") : undefined} tone="warning" loading={stats.isLoading} />
        <StatCard title="Resolved" value={stats.data ? count("RESOLVED") : undefined} tone="success" loading={stats.isLoading} />
        <StatCard title="Waiting over 7 days" value={stats.data?.overdueCount} icon={CircleAlert} tone="danger" loading={stats.isLoading} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Latest complaints</CardTitle>
          <Link href={`${basePath}/complaints`} className="text-sm text-primary underline-offset-4 hover:underline">All complaints</Link>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? <Skeleton className="h-24" /> : recent.isError ? <p role="alert" className="text-sm text-destructive">Couldn't load complaints.</p> : (recent.data?.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No complaints yet.</p> : (
            <ul className="divide-y">
              {recent.data!.data.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0"><Link href={`${basePath}/complaints/${c.id}`} className="font-medium underline-offset-4 hover:underline">{c.title}</Link><p className="text-xs text-muted-foreground">{submitterName(c)} · {formatDate(c.createdAt)}</p></div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
