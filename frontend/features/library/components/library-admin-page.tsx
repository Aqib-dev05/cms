"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BooksPanel } from "./books-panel";
import { IssuesPanel } from "./issues-panel";

/** Admin: books + issue/return in one place. (Librarians get them as separate pages.) */
export function LibraryAdminPage() {
  const [tab, setTab] = useState("books");
  return (
    <>
      <PageHeader title="Library" description="Catalogue, issued books and overdue returns." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Library sections">
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="issues">Issue &amp; return</TabsTrigger>
        </TabsList>
        <TabsContent value="books"><BooksPanel canManage /></TabsContent>
        <TabsContent value="issues"><IssuesPanel /></TabsContent>
      </Tabs>
    </>
  );
}
