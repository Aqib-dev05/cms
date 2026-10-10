"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { History } from "lucide-react";
import { fetchMyProfile } from "@/features/students/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHistory } from "../hooks";
import type { HistoryIssue } from "../types";
import { BooksPanel } from "./books-panel";

export function MyLibraryPage() {
  const [tab, setTab] = useState("mine");
  const profile = useQuery({ queryKey: ["students", "me"], queryFn: fetchMyProfile });
  const history = useHistory(profile.data?.studentProfile.id);
  const now = Date.now();

  const columns: Column<HistoryIssue>[] = [
    { id: "book", header: "Book", cell: (i) => <div className="min-w-0"><p className="font-medium">{i.bookCopy.book.title}</p><p className="text-xs text-muted-foreground">{i.bookCopy.book.author}</p></div> },
    { id: "issued", header: "Issued", hideOnMobile: true, cell: (i) => formatDate(i.issuedAt) },
    { id: "due", header: "Due", cell: (i) => formatDate(i.dueDate) },
    {
      id: "status",
      header: "Status",
      cell: (i) =>
        i.returnedAt ? (
          <span className="text-sm text-muted-foreground">Returned {formatDate(i.returnedAt)}</span>
        ) : new Date(i.dueDate).getTime() < now ? (
          <Badge variant="destructive">Overdue</Badge>
        ) : (
          <Badge variant="info">Borrowed</Badge>
        ),
    },
    { id: "fine", header: "Fine", align: "right", cell: (i) => (i.fine > 0 ? <span className="tabular-nums">{formatCurrency(i.fine)}{i.finePaid ? " (paid)" : ""}</span> : "—") },
  ];

  return (
    <>
      <PageHeader title="Library" description="Your borrowed books, and the catalogue." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Library views">
          <TabsTrigger value="mine">My books</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <DataTable caption="My borrowed books" columns={columns} data={history.data} getRowId={(i) => i.id} isLoading={profile.isLoading || history.isLoading} isError={profile.isError || history.isError} error={profile.error ?? history.error} onRetry={() => { profile.refetch(); history.refetch(); }} empty={{ icon: History, title: "You haven't borrowed anything yet", description: "Visit the library desk to borrow a book." }} />
        </TabsContent>
        <TabsContent value="catalogue">
          <BooksPanel canManage={false} />
        </TabsContent>
      </Tabs>
    </>
  );
}

