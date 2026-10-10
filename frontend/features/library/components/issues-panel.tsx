"use client";

import { useState } from "react";
import { BookCheck, BookMarked, Plus, Undo2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { usePageState } from "@/hooks/use-page-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveIssues, useOverdueIssues, useReturnBook } from "../hooks";
import type { ActiveIssue, OverdueIssue } from "../types";
import { IssueBookDialog } from "./issue-book-dialog";

export function IssuesPanel() {
  const [tab, setTab] = useState("active");
  const { page, limit, params, setPage, setLimit, setSearch } = usePageState(20);
  const active = useActiveIssues(params);
  const overdue = useOverdueIssues();
  const ret = useReturnBook();
  const [returning, setReturning] = useState<ActiveIssue | null>(null);
  const [issuing, setIssuing] = useState(false);

  const activeColumns: Column<ActiveIssue>[] = [
    { id: "book", header: "Book", cell: (i) => <div className="min-w-0"><p className="font-medium">{i.bookCopy.book.title}</p><p className="text-xs text-muted-foreground">Copy {i.bookCopy.copyNumber}</p></div> },
    { id: "student", header: "Student", cell: (i) => <div><p>{i.studentProfile.firstName} {i.studentProfile.lastName}</p><p className="text-xs text-muted-foreground tabular-nums">{i.studentProfile.registrationNo}</p></div> },
    { id: "issued", header: "Issued", hideOnMobile: true, cell: (i) => formatDate(i.issuedAt) },
    { id: "due", header: "Due", cell: (i) => <div className="flex flex-wrap items-center gap-2"><span>{formatDate(i.dueDate)}</span>{i.isOverdue && <Badge variant="destructive">{i.daysOverdue}d late</Badge>}</div> },
    { id: "actions", header: "", align: "right", cell: (i) => <Button size="sm" variant="outline" onClick={() => setReturning(i)}><Undo2 aria-hidden="true" /> Return</Button> },
  ];
  const overdueColumns: Column<OverdueIssue>[] = [
    { id: "book", header: "Book", cell: (i) => <div><p className="font-medium">{i.bookCopy.book.title}</p><p className="text-xs text-muted-foreground">Copy {i.bookCopy.copyNumber}</p></div> },
    { id: "student", header: "Student", cell: (i) => <div><p>{i.studentProfile.firstName} {i.studentProfile.lastName}</p><p className="text-xs text-muted-foreground tabular-nums">{i.studentProfile.registrationNo}</p></div> },
    { id: "phone", header: "Phone", hideOnMobile: true, cell: (i) => i.studentProfile.phone ?? "—" },
    { id: "due", header: "Was due", cell: (i) => formatDate(i.dueDate) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIssuing(true)}><Plus aria-hidden="true" /> Issue a book</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Issue lists">
          <TabsTrigger value="active">Currently issued</TabsTrigger>
          <TabsTrigger value="overdue">Overdue{overdue.data && overdue.data.length > 0 ? ` (${overdue.data.length})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          <SearchInput onSearch={setSearch} placeholder="Student name or reg. no" label="Search issued books" className="sm:max-w-sm" />
          <DataTable caption="Issued books" columns={activeColumns} data={active.data?.data} getRowId={(i) => i.id} isLoading={active.isLoading} isFetching={active.isFetching} isError={active.isError} error={active.error} onRetry={() => active.refetch()} empty={{ icon: BookMarked, title: params.search ? "No matches" : "No books are issued", description: params.search ? undefined : "Issued books will be listed here." }} pagination={active.data && { ...active.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }} />
        </TabsContent>
        <TabsContent value="overdue">
          <DataTable caption="Overdue books" columns={overdueColumns} data={overdue.data} getRowId={(i) => i.id} isLoading={overdue.isLoading} isError={overdue.isError} error={overdue.error} onRetry={() => overdue.refetch()} empty={{ icon: BookCheck, title: "Nothing overdue", description: "Every issued book is within its due date." }} />
        </TabsContent>
      </Tabs>
      {issuing && <IssueBookDialog onOpenChange={(o) => !o && setIssuing(false)} />}
      <ConfirmDialog
        open={!!returning}
        onOpenChange={(o) => !o && setReturning(null)}
        title="Mark this book as returned?"
        description={returning ? `${returning.bookCopy.book.title} from ${returning.studentProfile.firstName} ${returning.studentProfile.lastName}.${returning.isOverdue ? " It is overdue, so a fine will be calculated." : ""}` : undefined}
        confirmLabel="Mark returned"
        loading={ret.isPending}
        onConfirm={() => returning && ret.mutate(returning.id, { onSuccess: () => setReturning(null) })}
      />
    </div>
  );
}
