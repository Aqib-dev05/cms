"use client";

import { useState } from "react";
import { CircleCheck, CreditCard } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { StudentPicker, type PickedStudent } from "@/components/shared/student-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useInvoices } from "../hooks";
import type { Invoice } from "../types";
import { RecordPaymentDialog } from "./invoice-dialogs";
import { invoiceHref } from "./invoices-page";

/** Counter workflow: find a student → see what they owe → record a payment. */
export function PaymentsPage() {
  const { role, basePath } = useRole();
  const [student, setStudent] = useState<PickedStudent | null>(null);
  const q = useInvoices({ page: 1, limit: 50, studentProfileId: student?.profileId }, !!student);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const owing = (q.data?.data ?? []).filter((i) => i.status !== "PAID" && i.dueAmount > 0);
  const totalDue = owing.reduce((s, i) => s + i.dueAmount, 0);

  const columns: Column<Invoice>[] = [
    { id: "no", header: "Invoice", cell: (i) => <Link className="font-medium tabular-nums underline-offset-4 hover:underline" href={invoiceHref(basePath, role, i.id)}>{i.invoiceNo}</Link> },
    { id: "semester", header: "Semester", hideOnMobile: true, cell: (i) => i.semester ?? "—" },
    { id: "dueDate", header: "Due date", hideOnMobile: true, cell: (i) => formatDate(i.dueDate) },
    { id: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
    { id: "due", header: "Balance", align: "right", cell: (i) => <span className="font-medium tabular-nums">{formatCurrency(i.dueAmount)}</span> },
    { id: "actions", header: "", align: "right", cell: (i) => <Button size="sm" onClick={() => setPaying(i)}>Record payment</Button> },
  ];

  return (
    <>
      <PageHeader title="Payments" description="Look up a student, then take a payment against one of their open invoices." />
      <div className="mb-6 max-w-xl space-y-2">
        <Label htmlFor="pay-student">Student</Label>
        <StudentPicker id="pay-student" value={student} onChange={setStudent} includeInactive />
      </div>
      {!student ? (
        <EmptyState icon={CreditCard} title="Find a student" description="Search by name, registration number or CNIC." />
      ) : q.data && owing.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Nothing outstanding" description={`${student.name} has no unpaid invoices.`} />
      ) : (
        <div className="space-y-3">
          {owing.length > 0 && <p className="text-sm text-muted-foreground">Total outstanding: <strong className="tabular-nums text-foreground">{formatCurrency(totalDue)}</strong></p>}
          <DataTable caption={`Open invoices for ${student.name}`} columns={columns} data={q.data ? owing : undefined} getRowId={(i) => i.id} isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: CircleCheck, title: "Nothing outstanding" }} />
        </div>
      )}
      {paying && <RecordPaymentDialog invoice={paying} onOpenChange={(o) => !o && setPaying(null)} />}
    </>
  );
}
