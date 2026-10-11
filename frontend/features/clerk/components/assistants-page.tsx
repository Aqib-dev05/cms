"use client";

import { useState } from "react";
import { KeyRound, ListChecks, Plus, UserCog } from "lucide-react";
import { usePageState } from "@/hooks/use-page-state";
import { formatDateTime } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ExportMenu } from "@/components/shared/export-menu";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAssistants, useDuties, useSetAssistantStatus } from "../hooks";
import type { Assistant } from "../types";
import { CreateAssistantDialog, EditDutiesDialog, ResetPasswordDialog } from "./assistant-dialogs";

/** Head clerk's team: create assistants and decide, with checkboxes, which duties each one handles. */
export function AssistantsPage() {
  const { page, limit, setPage, setLimit } = usePageState(20);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Assistant | null>(null);
  const [resetting, setResetting] = useState<Assistant | null>(null);
  const q = useAssistants({ page, limit, search: search || undefined });
  const duties = useDuties();
  const status = useSetAssistantStatus();
  const labelOf = (key: string) => duties.data?.find((d) => d.key === key)?.label ?? key;

  const columns: Column<Assistant>[] = [
    { id: "name", header: "Assistant", cell: (a) => <div><p className="font-medium">{a.staffProfile ? `${a.staffProfile.firstName} ${a.staffProfile.lastName}` : a.username}</p><p className="text-xs text-muted-foreground">@{a.username}</p></div> },
    { id: "duties", header: "Duties", cell: (a) => (a.duties.length ? <div className="flex flex-wrap gap-1">{a.duties.map((d) => <Badge key={d} variant="secondary">{labelOf(d)}</Badge>)}</div> : <span className="text-sm text-muted-foreground">None yet</span>) },
    { id: "login", header: "Last login", hideOnMobile: true, cell: (a) => (a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "Never") },
    { id: "status", header: "Status", cell: (a) => <Badge variant={a.isActive ? "success" : "secondary"}>{a.isActive ? "Active" : "Inactive"}</Badge> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (a) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => setEditing(a)}><ListChecks aria-hidden="true" /> Duties</Button>
          <Button size="sm" variant="ghost" aria-label={`Reset password for ${a.username}`} onClick={() => setResetting(a)}><KeyRound aria-hidden="true" /></Button>
          <Button size="sm" variant="ghost" loading={status.isPending && status.variables?.id === a.id} onClick={() => status.mutate({ id: a.id, isActive: !a.isActive })}>{a.isActive ? "Deactivate" : "Activate"}</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Assistants" description="Your assistant clerks. Tick the duties each one handles — student records, fee records, collection, verification, college fund and more." actions={<div className="flex gap-2"><ExportMenu resource="assistants" /><Button onClick={() => setCreating(true)}><Plus aria-hidden="true" /> New assistant</Button></div>} />
      <div className="mb-4">
        <SearchInput onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or username" label="Search assistants" className="sm:w-80" />
      </div>
      <DataTable caption="Assistants" columns={columns} data={q.data?.data} getRowId={(a) => a.id} isLoading={q.isLoading} isFetching={q.isFetching} isError={q.isError} error={q.error} onRetry={() => q.refetch()} empty={{ icon: UserCog, title: "No assistants yet", description: "Create an assistant and tick the duties they should handle." }} pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }} />
      {creating && <CreateAssistantDialog onOpenChange={(o) => !o && setCreating(false)} />}
      {editing && <EditDutiesDialog assistant={editing} onOpenChange={(o) => !o && setEditing(null)} />}
      {resetting && <ResetPasswordDialog assistant={resetting} onOpenChange={(o) => !o && setResetting(null)} />}
    </>
  );
}
