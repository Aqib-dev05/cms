"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BadgePercent, CreditCard, FileDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { openPdf } from "@/lib/api-helpers";
import { formatCurrency, formatDate, formatDateTime, humanize } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { DataTable, type Column } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice } from "../hooks";
import type { Discount, Payment } from "../types";
import { DiscountDialog, RecordPaymentDialog } from "./invoice-dialogs";

const PAYMENT_COLUMNS: Column<Payment>[] = [
  { id: "date", header: "Date", cell: (p) => formatDateTime(p.paidAt) },
  { id: "amount", header: "Amount", align: "right", cell: (p) => <span className="tabular-nums">{formatCurrency(p.amount)}</span> },
  { id: "method", header: "Method", cell: (p) => humanize(p.method) },
  { id: "tx", header: "Reference", hideOnMobile: true, cell: (p) => p.transactionId ?? "—" },
];
const DISCOUNT_COLUMNS: Column<Discount>[] = [
  { id: "date", header: "Date", cell: (d) => formatDate(d.createdAt) },
  { id: "amount", header: "Amount", align: "right", cell: (d) => <span className="tabular-nums">{formatCurrency(d.amount)}</span> },
  { id: "reason", header: "Reason", cell: (d) => d.reason },
];

export function InvoiceDetailPage({ id }: { id: string }) {
  const { role, basePath } = useRole();
  const q = useInvoice(id);
  const [dialog, setDialog] = useState<"pay" | "discount" | null>(null);
  const [downloading, setDownloading] = useState(false);
  const listHref = `${basePath}/${role === "ADMIN" ? "finance" : "invoices"}`;
  const canDiscount = role === "ADMIN" || role === "HEAD_CLERK";
  const back = (
    <Button variant="outline" asChild>
      <Link href={listHref}>
        <ArrowLeft aria-hidden="true" /> All invoices
      </Link>
    </Button>
  );

  if (q.isLoading) return <div aria-busy="true" className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-64" /></div>;
  if (q.isError || !q.data) return <><PageHeader title="Invoice" actions={back} /><ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load this invoice" /></>;

  const inv = q.data;
  const open = inv.status !== "PAID";
  const receipt = async () => {
    setDownloading(true);
    try {
      await openPdf(`/pdf/fee-receipt/${inv.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Invoice ${inv.invoiceNo}`}
        description={inv.studentProfile ? `${inv.studentProfile.firstName} ${inv.studentProfile.lastName} · ${inv.studentProfile.registrationNo}` : undefined}
        actions={
          <>
            {back}
            {inv.payments.length > 0 && (
              <Button variant="outline" onClick={receipt} loading={downloading}>
                <FileDown aria-hidden="true" /> Receipt
              </Button>
            )}
            {open && canDiscount && (
              <Button variant="outline" onClick={() => setDialog("discount")}>
                <BadgePercent aria-hidden="true" /> Discount
              </Button>
            )}
            {open && (
              <Button onClick={() => setDialog("pay")}>
                <CreditCard aria-hidden="true" /> Record payment
              </Button>
            )}
          </>
        }
      />
      <div className="mb-6 flex items-center gap-3"><StatusBadge status={inv.status} /><span className="text-sm text-muted-foreground">Due {formatDate(inv.dueDate)}</span></div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Amounts</CardTitle></CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Total billed", value: formatCurrency(inv.totalAmount) },
                { label: "Discount", value: formatCurrency(inv.discountAmount) },
                { label: "Paid", value: formatCurrency(inv.paidAmount) },
                { label: "Balance due", value: <strong>{formatCurrency(inv.dueAmount)}</strong> },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Student program", value: inv.studentProfile?.program ? `${inv.studentProfile.program.name} (${inv.studentProfile.program.code})` : null },
                { label: "Semester", value: inv.semester },
                { label: "Issued", value: formatDate(inv.issuedAt) },
                { label: "Remarks", value: inv.remarks },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="pay-h" className="mt-6 space-y-3">
        <h2 id="pay-h" className="text-base font-semibold">Payments</h2>
        <DataTable caption="Payments" columns={PAYMENT_COLUMNS} data={inv.payments} getRowId={(p) => p.id} empty={{ icon: Wallet, title: "No payments yet" }} />
      </section>
      {inv.discounts.length > 0 && (
        <section aria-labelledby="disc-h" className="mt-6 space-y-3">
          <h2 id="disc-h" className="text-base font-semibold">Discounts</h2>
          <DataTable caption="Discounts" columns={DISCOUNT_COLUMNS} data={inv.discounts} getRowId={(d) => d.id} empty={{ icon: BadgePercent, title: "No discounts" }} />
        </section>
      )}

      {dialog === "pay" && <RecordPaymentDialog invoice={inv} onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "discount" && <DiscountDialog invoice={inv} onOpenChange={(o) => !o && setDialog(null)} />}
    </>
  );
}
