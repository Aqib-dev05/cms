"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, CircleAlert, FilterX, Plus, Receipt, Wallet } from "lucide-react";
import { usePageState } from "@/hooks/use-page-state";
import { useRole } from "@/hooks/use-role";
import { formatCurrency, formatDate } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { StudentPicker, type PickedStudent } from "@/components/shared/student-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useFinanceSummary, useInvoices } from "../hooks";
import { FEE_STATUSES, type FeeStatus, type Invoice } from "../types";
import { CreateInvoiceDialog } from "./invoice-dialogs";

/** Where an invoice's detail page lives for the current role. */
export const invoiceHref = (basePath: string, role: string | null, id: string) => `${basePath}/${role === "ADMIN" ? "finance" : "invoices"}/${id}`;

export function InvoicesPage({ showSummary = false, title = "Invoices", description = "Fee invoices and their payment status." }: { showSummary?: boolean; title?: string; description?: string }) {
  const router = useRouter();
  const { role, basePath } = useRole();
  const { page, limit, setPage, setLimit } = usePageState(20);
  const [status, setStatus] = useState<FeeStatus | "">("");
  const [student, setStudent] = useState<PickedStudent | null>(null);
  const [creating, setCreating] = useState(false);
  const summary = useFinanceSummary(showSummary);
  const q = useInvoices({ page, limit, status: status || undefined, studentProfileId: student?.profileId });
  const filtersActive = !!(status || student);

  const columns: Column<Invoice>[] = [
    { id: "no", header: "Invoice", cell: (i) => <span className="font-medium tabular-nums">{i.invoiceNo}</span> },
    { id: "student", header: "Student", cell: (i) => (i.studentProfile ? <div><p>{i.studentProfile.firstName} {i.studentProfile.lastName}</p><p className="text-xs text-muted-foreground tabular-nums">{i.studentProfile.registrationNo}</p></div> : "—") },
    { id: "semester", header: "Semester", hideOnMobile: true, cell: (i) => i.semester ?? "—" },
    { id: "total", header: "Total", align: "right", hideOnMobile: true, cell: (i) => <span className="tabular-nums">{formatCurrency(i.totalAmount)}</span> },
    { id: "due", header: "Due", align: "right", cell: (i) => <span className="tabular-nums">{formatCurrency(i.dueAmount)}</span> },
    { id: "dueDate", header: "Due date", hideOnMobile: true, cell: (i) => formatDate(i.dueDate) },
    { id: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
  ];

  const s = summary.data;
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> New invoice
          </Button>
        }
      />
      {showSummary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard title="Total collected" value={s ? formatCurrency(s.totalCollected) : undefined} icon={Banknote} tone="success" loading={summary.isLoading} />
          <StatCard title="Outstanding" value={s ? formatCurrency(s.totalDue) : undefined} icon={Wallet} tone="warning" loading={summary.isLoading} />
          <StatCard title="Overdue invoices" value={s?.overdueCount} icon={CircleAlert} tone="danger" loading={summary.isLoading} />
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="lg:w-96">
          <StudentPicker value={student} onChange={(v) => { setStudent(v); setPage(1); }} includeInactive />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as FeeStatus | ""); setPage(1); }} className="lg:w-44">
          <option value="">All statuses</option>
          {FEE_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={() => { setStatus(""); setStudent(null); setPage(1); }}>
            <FilterX aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>
      <DataTable
        caption="Invoices"
        columns={columns}
        data={q.data?.data}
        getRowId={(i) => i.id}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        onRowClick={(i) => router.push(invoiceHref(basePath, role, i.id))}
        empty={{ icon: Receipt, title: filtersActive ? "No invoices match" : "No invoices yet", description: filtersActive ? "Try different filters." : "Create the first invoice for a student." }}
        pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }}
      />
      {creating && <CreateInvoiceDialog onOpenChange={(o) => !o && setCreating(false)} />}
    </>
  );
}
