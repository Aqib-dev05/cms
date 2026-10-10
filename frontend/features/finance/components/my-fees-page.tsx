"use client";

import { useState } from "react";
import { Banknote, CircleCheck, FileDown, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { openPdf } from "@/lib/api-helpers";
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyFinance } from "../hooks";

export function MyFeesPage() {
  const q = useMyFinance();
  const [busy, setBusy] = useState<string | null>(null);
  const s = q.data?.summary;
  const receipt = async (id: string) => {
    setBusy(id);
    try {
      await openPdf(`/pdf/fee-receipt/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <PageHeader title="Fees" description="Your invoices, payments and balance." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Total billed" value={s ? formatCurrency(s.totalBilled) : undefined} icon={Receipt} loading={q.isLoading} />
        <StatCard title="Paid" value={s ? formatCurrency(s.totalPaid) : undefined} icon={Banknote} tone="success" loading={q.isLoading} />
        <StatCard title="Balance due" value={s ? formatCurrency(s.totalDue) : undefined} icon={Wallet} tone={s && s.totalDue > 0 ? "warning" : "success"} loading={q.isLoading} />
      </div>
      {q.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.invoices.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No invoices" description="Fee invoices issued to you will appear here." />
      ) : (
        <div className="space-y-4">
          {q.data.invoices.map((inv) => (
            <Card key={inv.id}>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base tabular-nums">{inv.invoiceNo}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{inv.semester ? `${inv.semester} · ` : ""}Due {formatDate(inv.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={inv.status} />
                  {inv.payments.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => receipt(inv.id)} loading={busy === inv.id}>
                      <FileDown aria-hidden="true" /> Receipt
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">Total</dt><dd className="font-medium tabular-nums">{formatCurrency(inv.totalAmount)}</dd></div>
                  <div><dt className="text-muted-foreground">Discount</dt><dd className="font-medium tabular-nums">{formatCurrency(inv.discountAmount)}</dd></div>
                  <div><dt className="text-muted-foreground">Paid</dt><dd className="font-medium tabular-nums">{formatCurrency(inv.paidAmount)}</dd></div>
                  <div><dt className="text-muted-foreground">Balance</dt><dd className="font-semibold tabular-nums">{formatCurrency(inv.dueAmount)}</dd></div>
                </dl>
                {inv.payments.length > 0 && (
                  <ul className="divide-y rounded-md border text-sm">
                    {inv.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-muted-foreground">{formatDate(p.paidAt)} · {humanize(p.method)}</span>
                        <span className="tabular-nums">{formatCurrency(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
