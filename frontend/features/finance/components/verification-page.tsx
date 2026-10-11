"use client";

import { useState } from "react";
import { z } from "zod";
import { BadgeCheck, Banknote, Hourglass } from "lucide-react";
import { usePageState } from "@/hooks/use-page-state";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDateTime, humanize } from "@/lib/format";
import { optText, useZodForm } from "@/lib/form";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { ExportMenu } from "@/components/shared/export-menu";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFinanceSummary, usePayments, useRejectPayment, useVerifyPayment } from "../hooks";
import { VERIFICATION_STATUSES, type PaymentRow, type VerificationStatus } from "../types";

const noteSchema = z.object({ note: optText(300) });

function ReviewDialog({ payment, mode, onOpenChange }: { payment: PaymentRow; mode: "verify" | "reject"; onOpenChange: (o: boolean) => void }) {
  const verify = useVerifyPayment();
  const reject = useRejectPayment();
  const m = mode === "verify" ? verify : reject;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useZodForm(noteSchema, { note: "" });
  const submit = handleSubmit(({ note }) => {
    if (mode === "verify") return verify.mutate({ id: payment.id, note }, { onSuccess: () => onOpenChange(false) });
    if (!note || note.length < 5) return setError("note", { message: "Say why you are rejecting it (at least 5 characters)" });
    reject.mutate({ id: payment.id, note }, { onSuccess: () => onOpenChange(false) });
  });
  const s = payment.invoice.studentProfile;

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={mode === "verify" ? "Verify payment" : "Reject payment"}
      description={`${formatCurrency(payment.amount)} · ${humanize(payment.method)} · ${payment.invoice.invoiceNo} · ${s.firstName} ${s.lastName}`}
      submitLabel={mode === "verify" ? "Verify & apply to invoice" : "Reject payment"}
      destructive={mode === "reject"}
      onSubmit={submit}
      isSubmitting={m.isPending}
      error={m.isError ? getErrorMessage(m.error) : null}
    >
      {payment.transactionId && <p className="text-sm text-muted-foreground">Transaction ID: <strong className="text-foreground">{payment.transactionId}</strong> — check it against the bank slip or statement.</p>}
      <FormField id="rv-note" label={mode === "verify" ? "Note (optional)" : "Reason"} required={mode === "reject"} error={errors.note?.message}>
        <Textarea rows={3} {...register("note")} />
      </FormField>
    </FormDialog>
  );
}

/** Verification queue: payments received at the counter wait here until someone with the verification duty signs them off. */
export function VerificationPage() {
  const { page, limit, setPage, setLimit } = usePageState(20);
  const [status, setStatus] = useState<VerificationStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [review, setReview] = useState<{ payment: PaymentRow; mode: "verify" | "reject" } | null>(null);
  const q = usePayments({ page, limit, status, search: search || undefined });
  const summary = useFinanceSummary();

  const columns: Column<PaymentRow>[] = [
    { id: "inv", header: "Invoice", cell: (p) => <div><p className="font-medium tabular-nums">{p.invoice.invoiceNo}</p><p className="text-xs text-muted-foreground">{p.invoice.studentProfile.firstName} {p.invoice.studentProfile.lastName} · {p.invoice.studentProfile.registrationNo}</p></div> },
    { id: "amount", header: "Amount", align: "right", cell: (p) => <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span> },
    { id: "method", header: "Method", hideOnMobile: true, cell: (p) => <div><p>{humanize(p.method)}</p>{p.transactionId && <p className="text-xs text-muted-foreground tabular-nums">{p.transactionId}</p>}</div> },
    { id: "by", header: "Collected by", hideOnMobile: true, cell: (p) => <div><p>{p.receivedByName ?? "—"}</p><p className="text-xs text-muted-foreground">{formatDateTime(p.paidAt)}</p></div> },
    { id: "status", header: "Status", cell: (p) => <div><StatusBadge status={p.verificationStatus} />{p.verifiedByName && <p className="mt-1 text-xs text-muted-foreground">by {p.verifiedByName}</p>}</div> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (p) => {
        if (p.verificationStatus !== "PENDING") return p.verificationNote ? <span className="text-xs text-muted-foreground">{p.verificationNote}</span> : null;
        return (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setReview({ payment: p, mode: "verify" })}>Verify</Button>
            <Button size="sm" variant="outline" onClick={() => setReview({ payment: p, mode: "reject" })}>Reject</Button>
          </div>
        );
      },
    },
  ];

  const s = summary.data;
  return (
    <>
      <PageHeader title="Payment verification" description="Check each received payment against the bank slip or cash register, then verify it. Only verified payments reduce what a student owes." actions={<ExportMenu resource="payments" params={{ status }} />} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title="Waiting for verification" value={s?.pendingVerificationCount} icon={Hourglass} tone="warning" loading={summary.isLoading} />
        <StatCard title="Amount waiting" value={s ? formatCurrency(s.pendingVerificationAmount ?? 0) : undefined} icon={Banknote} loading={summary.isLoading} />
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Invoice no, student, transaction ID…" label="Search payments" className="sm:w-80" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as VerificationStatus); setPage(1); }} className="sm:w-44">
          {VERIFICATION_STATUSES.map((v) => <option key={v} value={v}>{humanize(v)}</option>)}
        </Select>
      </div>
      <DataTable
        caption="Payments"
        columns={columns}
        data={q.data?.data}
        getRowId={(p) => p.id}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        empty={{ icon: BadgeCheck, title: status === "PENDING" ? "Nothing to verify" : "No payments", description: status === "PENDING" ? "Every received payment has been reviewed." : "No payments with this status." }}
        pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }}
      />
      {review && <ReviewDialog payment={review.payment} mode={review.mode} onOpenChange={(o) => !o && setReview(null)} />}
    </>
  );
}
