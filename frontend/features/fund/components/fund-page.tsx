"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Landmark, PiggyBank, Plus } from "lucide-react";
import { useCan } from "@/hooks/use-can";
import { usePageState } from "@/hooks/use-page-state";
import { formatCurrency, formatDate, formatMonthKey, humanize } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ExportMenu } from "@/components/shared/export-menu";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useFundEntries, useFundSummary } from "../hooks";
import type { FundEntry, FundType } from "../types";
import { AddFundEntryDialog, VoidEntryDialog } from "./fund-dialogs";

/** College fund: fee collections (verified payments) + grants/donations in, expenses out. */
export function FundPage() {
  const canCreate = useCan("fund.create");
  const canVoid = useCan("fund.manage");
  const { page, limit, setPage, setLimit } = usePageState(20);
  const [type, setType] = useState<FundType | "">("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<FundType | null>(null);
  const [voiding, setVoiding] = useState<FundEntry | null>(null);
  const summary = useFundSummary({});
  const q = useFundEntries({ page, limit, type: type || undefined, search: search || undefined });
  const s = summary.data;

  const columns: Column<FundEntry>[] = [
    { id: "date", header: "Date", cell: (e) => <span className="tabular-nums">{formatDate(e.entryDate)}</span> },
    { id: "what", header: "Entry", cell: (e) => <div><p className="font-medium">{e.description}</p><p className="text-xs text-muted-foreground">{humanize(e.category)}{e.source ? ` · ${e.source}` : ""}{e.reference ? ` · ${e.reference}` : ""}</p></div> },
    { id: "by", header: "Recorded by", hideOnMobile: true, cell: (e) => (e.recordedBy.staffProfile ? `${e.recordedBy.staffProfile.firstName} ${e.recordedBy.staffProfile.lastName}` : e.recordedBy.username) },
    { id: "amount", header: "Amount", align: "right", cell: (e) => <span className={`font-medium tabular-nums ${e.type === "EXPENSE" ? "text-destructive" : "text-success"}`}>{e.type === "EXPENSE" ? "−" : "+"}{formatCurrency(e.amount)}</span> },
    { id: "actions", header: "", align: "right", cell: (e) => (canVoid ? <Button size="sm" variant="ghost" onClick={() => setVoiding(e)}>Void</Button> : null) },
  ];

  return (
    <>
      <PageHeader
        title="College fund"
        description="Everything that comes into and goes out of the college fund."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportMenu resource="fund" params={{ type }} />
            {canCreate && (
              <>
                <Button variant="outline" onClick={() => setAdding("EXPENSE")}><ArrowUpCircle aria-hidden="true" /> Expense</Button>
                <Button onClick={() => setAdding("INCOME")}><Plus aria-hidden="true" /> Income</Button>
              </>
            )}
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Fund balance" value={s ? formatCurrency(s.balance) : undefined} icon={PiggyBank} tone={s && s.balance < 0 ? "danger" : "success"} loading={summary.isLoading} description="Fees + other income − expenses" />
        <StatCard title="Fees collected" value={s ? formatCurrency(s.allTime.feeCollected) : undefined} icon={Banknote} loading={summary.isLoading} description="Verified payments only" />
        <StatCard title="Grants & donations" value={s ? formatCurrency(s.allTime.otherIncome) : undefined} icon={Landmark} loading={summary.isLoading} />
        <StatCard title="Expenses" value={s ? formatCurrency(s.allTime.expenses) : undefined} icon={ArrowDownCircle} tone="warning" loading={summary.isLoading} />
      </div>

      {s && s.monthly.length > 0 && (
        <section aria-labelledby="fund-monthly" className="mb-6 space-y-2">
          <h2 id="fund-monthly" className="text-base font-semibold">Last 6 months</h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-2">Month</th><th className="p-2 text-right">In</th><th className="p-2 text-right">Out</th><th className="p-2 text-right">Net</th></tr></thead>
              <tbody>
                {s.monthly.map((m) => (
                  <tr key={m.month} className="border-t">
                    <td className="p-2">{formatMonthKey(m.month, "long")}</td>
                    <td className="p-2 text-right tabular-nums">{formatCurrency(m.income)}</td>
                    <td className="p-2 text-right tabular-nums">{formatCurrency(m.expense)}</td>
                    <td className="p-2 text-right font-medium tabular-nums">{formatCurrency(m.income - m.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="fund-entries" className="space-y-3">
        <h2 id="fund-entries" className="flex items-center gap-2 text-base font-semibold">Ledger <Badge variant="secondary">Grants, donations &amp; expenses</Badge></h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search description, source, reference" label="Search ledger" className="sm:w-80" />
          <Select aria-label="Filter by type" value={type} onChange={(e) => { setType(e.target.value as FundType | ""); setPage(1); }} className="sm:w-40">
            <option value="">All entries</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expenses</option>
          </Select>
        </div>
        <DataTable caption="Fund ledger" columns={columns} data={q.data?.data} getRowId={(e) => e.id} isLoading={q.isLoading} isFetching={q.isFetching} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: PiggyBank, title: "No entries yet", description: "Record a donation, grant or expense." }} pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }} />
      </section>
      {adding && <AddFundEntryDialog type={adding} onOpenChange={(o) => !o && setAdding(null)} />}
      {voiding && <VoidEntryDialog entry={voiding} onOpenChange={(o) => !o && setVoiding(null)} />}
    </>
  );
}
