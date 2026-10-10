"use client";

import { Banknote, CircleAlert, Receipt, Wallet } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useFinanceSummary } from "../hooks";
import type { FinanceSummary } from "../types";

type Row = FinanceSummary["byStatus"][number];

export function FinanceReportsPage() {
  const q = useFinanceSummary();
  const s = q.data;
  const invoices = s?.byStatus.reduce((t, r) => t + r._count.id, 0);
  const columns: Column<Row>[] = [
    { id: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { id: "count", header: "Invoices", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r._count.id)}</span> },
    { id: "amount", header: "Billed amount", align: "right", cell: (r) => <span className="tabular-nums">{formatCurrency(r._sum.totalAmount ?? 0)}</span> },
  ];
  return (
    <>
      <PageHeader title="Reports" description="Collections and outstanding balances across the college." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total collected" value={s ? formatCurrency(s.totalCollected) : undefined} icon={Banknote} tone="success" loading={q.isLoading} />
        <StatCard title="Outstanding" value={s ? formatCurrency(s.totalDue) : undefined} icon={Wallet} tone="warning" loading={q.isLoading} />
        <StatCard title="Overdue invoices" value={s?.overdueCount} icon={CircleAlert} tone="danger" loading={q.isLoading} />
        <StatCard title="Invoices issued" value={invoices !== undefined ? formatNumber(invoices) : undefined} icon={Receipt} loading={q.isLoading} />
      </div>
      <section aria-labelledby="by-status" className="space-y-3">
        <h2 id="by-status" className="text-base font-semibold">Invoices by status</h2>
        <DataTable caption="Invoices by status" columns={columns} data={s?.byStatus} getRowId={(r) => r.status} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: Receipt, title: "No invoices yet" }} />
      </section>
    </>
  );
}
