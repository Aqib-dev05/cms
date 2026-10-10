"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FilterX, ScrollText } from "lucide-react";
import { formatDateTime, humanize } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { usePageState } from "@/hooks/use-page-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { actorName, fetchAuditLogs, fetchAuditModules, type AuditLog } from "../api";

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{label}</h3>
      <pre className="max-h-60 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export function AuditPage() {
  const { page, limit, setPage, setLimit } = usePageState(20);
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<AuditLog | null>(null);
  const modules = useQuery({ queryKey: queryKeys.audit.modules, queryFn: fetchAuditModules, staleTime: 60_000 });
  const params = { page, limit, module: module || undefined, from: from || undefined, to: to ? `${to}T23:59:59` : undefined };
  const q = useQuery({ queryKey: queryKeys.audit.list(params), queryFn: () => fetchAuditLogs(params), placeholderData: keepPreviousData });
  const filtersActive = !!(module || from || to);

  const columns: Column<AuditLog>[] = [
    { id: "time", header: "When", cell: (l) => <span className="tabular-nums">{formatDateTime(l.createdAt)}</span> },
    { id: "who", header: "Who", cell: (l) => <div><p className="font-medium">{actorName(l)}</p>{l.user && <p className="text-xs text-muted-foreground">{humanize(l.user.role.name)}</p>}</div> },
    { id: "module", header: "Module", cell: (l) => <Badge variant="outline">{l.module}</Badge> },
    { id: "action", header: "Action", cell: (l) => humanize(l.action) },
    { id: "entity", header: "Record", hideOnMobile: true, cell: (l) => <span className="font-mono text-xs">{l.entityId ? `${l.entityId.slice(0, 8)}…` : "—"}</span> },
  ];

  return (
    <>
      <PageHeader title="Audit logs" description="Who did what, and when." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="audit-module">Module</Label>
          <Select id="audit-module" value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className="sm:w-48" disabled={modules.isLoading}>
            <option value="">All modules</option>
            {modules.data?.map((m) => <option key={m.module} value={m.module}>{m.module} ({m._count.id})</option>)}
          </Select>
        </div>
        <div className="space-y-2"><Label htmlFor="audit-from">From</Label><Input id="audit-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="space-y-2"><Label htmlFor="audit-to">To</Label><Input id="audit-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></div>
        {filtersActive && <Button variant="ghost" size="sm" onClick={() => { setModule(""); setFrom(""); setTo(""); setPage(1); }}><FilterX aria-hidden="true" /> Clear filters</Button>}
      </div>
      <DataTable caption="Audit log entries" columns={columns} data={q.data?.data} getRowId={(l) => l.id} isLoading={q.isLoading} isFetching={q.isFetching} isError={q.isError} error={q.error} onRetry={() => q.refetch()} onRowClick={setOpen} empty={{ icon: ScrollText, title: filtersActive ? "No entries match" : "Nothing logged yet" }} pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }} />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent size="lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{humanize(open.action)} · {open.module}</DialogTitle>
                <DialogDescription>{actorName(open)} · {formatDateTime(open.createdAt)}{open.ipAddress ? ` · ${open.ipAddress}` : ""}</DialogDescription>
              </DialogHeader>
              {open.entityId && <p className="text-sm"><span className="text-muted-foreground">Record: </span><code>{open.entityId}</code></p>}
              <JsonBlock label="Before" value={open.oldData} />
              <JsonBlock label="After" value={open.newData} />
              {!open.oldData && !open.newData && <p className="text-sm text-muted-foreground">No data was recorded for this entry.</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
