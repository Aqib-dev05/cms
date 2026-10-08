"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, GraduationCap, MessageSquareWarning, Receipt, RefreshCw, TriangleAlert, UserPlus, Users, Wallet } from "lucide-react";
import { AttendanceTrendChart } from "@/features/analytics/components/attendance-trend-chart";
import { EnrollmentChart } from "@/features/analytics/components/enrollment-chart";
import { FeeTrendChart } from "@/features/analytics/components/fee-trend-chart";
import { NeedsAttention } from "@/features/analytics/components/needs-attention";
import { useOverview } from "@/features/analytics/hooks";
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

const MIN_ATTENDANCE = 75;

export default function AdminDashboardPage() {
  const user = useAppSelector(selectUser);
  const queryClient = useQueryClient();
  const overview = useOverview();
  const o = overview.data;
  const loading = overview.isLoading;

  const rate = o?.attendance.rateThisMonth ?? null;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.username ?? ""}`}
        description={o ? `Overview of the college · updated ${formatDateTime(o.generatedAt)}` : "Overview of the college"}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["analytics"] })}
            loading={overview.isFetching && !loading}
          >
            {!(overview.isFetching && !loading) && <RefreshCw aria-hidden="true" />}
            Refresh
          </Button>
        }
      />

      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} title="Couldn't load the overview" className="mb-6" />
      ) : (
        <section aria-label="Key numbers" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active students"
            value={o && formatNumber(o.students.active)}
            description={o && `${o.academics.programs} programs · ${o.academics.departments} departments`}
            icon={GraduationCap}
            loading={loading}
          />
          <StatCard title="Active staff" value={o && formatNumber(o.staff.active)} icon={Users} loading={loading} />
          <StatCard title="Collected this month" value={o && formatCurrency(o.fees.collectedThisMonth)} icon={Wallet} tone="success" loading={loading} />
          <StatCard
            title="Outstanding fees"
            value={o && formatCurrency(o.fees.outstanding)}
            description={o && `${formatNumber(o.fees.overdueInvoices)} overdue invoices`}
            icon={Receipt}
            tone="warning"
            loading={loading}
          />
          <StatCard
            title="Attendance this month"
            value={o && formatPercent(rate)}
            description={rate === null ? "Nothing marked yet" : rate < MIN_ATTENDANCE ? `Below the ${MIN_ATTENDANCE}% minimum` : "Present or late"}
            icon={ClipboardCheck}
            tone={rate !== null && rate < MIN_ATTENDANCE ? "danger" : "default"}
            loading={loading}
          />
          <StatCard
            title="At-risk students"
            value={o && formatNumber(o.attendance.atRiskStudents)}
            description={`Under ${MIN_ATTENDANCE}% in the last 90 days`}
            icon={TriangleAlert}
            tone={o && o.attendance.atRiskStudents > 0 ? "danger" : "default"}
            loading={loading}
          />
          <StatCard title="Open complaints" value={o && formatNumber(o.complaints.open)} icon={MessageSquareWarning} tone="warning" loading={loading} />
          <StatCard title="Pending admissions" value={o && formatNumber(o.admissions.pending)} icon={UserPlus} tone="info" loading={loading} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <FeeTrendChart />
        <AttendanceTrendChart />
        <EnrollmentChart />
        <NeedsAttention overview={o} loading={loading} basePath="/admin" />
      </div>
    </>
  );
}
