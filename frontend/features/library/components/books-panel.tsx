"use client";

import { useState } from "react";
import { BookOpen, BookPlus, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { optInt, optText, reqInt, reqText, useZodForm } from "@/lib/form";
import { usePageState } from "@/hooks/use-page-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddCopies, useBook, useBooks, useCreateBook, useUpdateBook } from "../hooks";
import type { Book } from "../types";
import { IssueBookDialog } from "./issue-book-dialog";

const bookSchema = z.object({
  title: reqText(200),
  author: reqText(200),
  isbn: optText(20),
  publisher: optText(100),
  edition: optText(50),
  year: optInt(1900, new Date().getFullYear()),
  category: optText(50),
  totalCopies: optInt(1, 100),
});

function BookDialog({ book, onOpenChange }: { book?: Book; onOpenChange: (o: boolean) => void }) {
  const create = useCreateBook();
  const update = useUpdateBook();
  const mutation = book ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(bookSchema, { title: book?.title ?? "", author: book?.author ?? "", isbn: book?.isbn ?? "", publisher: book?.publisher ?? "", edition: book?.edition ?? "", year: book?.year ? String(book.year) : "", category: book?.category ?? "", totalCopies: "1" });
  const submit = handleSubmit((v) => {
    const { totalCopies, isbn, ...rest } = v;
    if (book) update.mutate({ id: book.id, ...rest }, { onSuccess: () => onOpenChange(false) });
    else create.mutate({ ...rest, isbn, totalCopies: totalCopies ?? 1 }, { onSuccess: () => onOpenChange(false) });
  });
  return (
    <FormDialog open onOpenChange={onOpenChange} size="lg" title={book ? "Edit book" : "Add a book"} onSubmit={submit} isSubmitting={mutation.isPending} error={mutation.isError ? getErrorMessage(mutation.error) : null} submitLabel={book ? "Save changes" : "Add book"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="bk-title" label="Title" required error={errors.title?.message} className="sm:col-span-2"><Input autoComplete="off" {...register("title")} /></FormField>
        <FormField id="bk-author" label="Author" required error={errors.author?.message}><Input autoComplete="off" {...register("author")} /></FormField>
        <FormField id="bk-category" label="Category" error={errors.category?.message}><Input autoComplete="off" {...register("category")} /></FormField>
        {!book && <FormField id="bk-isbn" label="ISBN" error={errors.isbn?.message}><Input autoComplete="off" {...register("isbn")} /></FormField>}
        <FormField id="bk-publisher" label="Publisher" error={errors.publisher?.message}><Input autoComplete="off" {...register("publisher")} /></FormField>
        <FormField id="bk-edition" label="Edition" error={errors.edition?.message}><Input autoComplete="off" {...register("edition")} /></FormField>
        <FormField id="bk-year" label="Year" error={errors.year?.message}><Input type="number" inputMode="numeric" {...register("year")} /></FormField>
        {!book && <FormField id="bk-copies" label="Number of copies" required error={errors.totalCopies?.message}><Input type="number" inputMode="numeric" min={1} max={100} {...register("totalCopies")} /></FormField>}
      </div>
    </FormDialog>
  );
}

function BookDetailDialog({ id, canManage, onOpenChange }: { id: string; canManage: boolean; onOpenChange: (o: boolean) => void }) {
  const q = useBook(id);
  const add = useAddCopies();
  const [count, setCount] = useState("1");
  const [issueCopy, setIssueCopy] = useState<string | null>(null);
  const b = q.data;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{b?.title ?? "Book"}</DialogTitle>
          <DialogDescription>{b ? `${b.author}${b.publisher ? ` · ${b.publisher}` : ""}${b.year ? ` · ${b.year}` : ""}` : "Loading…"}</DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <Skeleton className="h-40" />
        ) : q.isError || !b ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <ul className="divide-y rounded-lg border">
              {b.copies.map((c) => {
                const holder = c.issues[0];
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">Copy {c.copyNumber}</p>
                      {holder && <p className="text-xs text-muted-foreground">{holder.studentProfile.firstName} {holder.studentProfile.lastName} · due {formatDate(holder.dueDate)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      {canManage && c.status === "AVAILABLE" && <Button size="sm" variant="outline" onClick={() => setIssueCopy(c.id)}>Issue</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {canManage && (
              <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); const n = Number(count); if (Number.isInteger(n) && n >= 1 && n <= 50) add.mutate({ id, count: n }); }}>
                <div className="space-y-2">
                  <Label htmlFor="add-copies">Add copies</Label>
                  <Input id="add-copies" type="number" inputMode="numeric" min={1} max={50} value={count} onChange={(e) => setCount(e.target.value)} className="w-24" />
                </div>
                <Button type="submit" variant="outline" loading={add.isPending}><BookPlus aria-hidden="true" /> Add</Button>
              </form>
            )}
          </>
        )}
        {issueCopy && b && <IssueBookDialog book={{ id: b.id, title: b.title, copies: b.copies }} copyId={issueCopy} onOpenChange={(o) => !o && setIssueCopy(null)} />}
      </DialogContent>
    </Dialog>
  );
}

/** Catalogue table. `canManage` adds create / edit / copies / issue. */
export function BooksPanel({ canManage }: { canManage: boolean }) {
  const { page, limit, params, setPage, setLimit, setSearch } = usePageState(20);
  const q = useBooks(params);
  const [editing, setEditing] = useState<Book | "new" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const columns: Column<Book>[] = [
    { id: "title", header: "Book", cell: (b) => <div className="min-w-0"><p className="font-medium">{b.title}</p><p className="text-xs text-muted-foreground">{b.author}</p></div> },
    { id: "isbn", header: "ISBN", hideOnMobile: true, cell: (b) => <span className="tabular-nums">{b.isbn ?? "—"}</span> },
    { id: "category", header: "Category", hideOnMobile: true, cell: (b) => b.category ?? "—" },
    { id: "copies", header: "Available", align: "center", cell: (b) => <span className="tabular-nums">{b.copies.filter((c) => c.status === "AVAILABLE").length} / {b._count.copies}</span> },
  ];
  if (canManage) columns.push({ id: "actions", header: "", align: "right", cell: (b) => <Button variant="ghost" size="icon" aria-label={`Edit ${b.title}`} onClick={(e) => { e.stopPropagation(); setEditing(b); }}><Pencil aria-hidden="true" /></Button> });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput onSearch={setSearch} placeholder="Title, author or ISBN" label="Search books" className="sm:max-w-sm" />
        {canManage && <Button onClick={() => setEditing("new")}><Plus aria-hidden="true" /> Add book</Button>}
      </div>
      <DataTable caption="Books" columns={columns} data={q.data?.data} getRowId={(b) => b.id} isLoading={q.isLoading} isFetching={q.isFetching} isError={q.isError} error={q.error} onRetry={() => q.refetch()} onRowClick={(b) => setOpenId(b.id)} empty={{ icon: BookOpen, title: params.search ? "No books match your search" : "The catalogue is empty", description: canManage && !params.search ? "Add the first book." : undefined }} pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }} />
      {editing && <BookDialog key={editing === "new" ? "new" : editing.id} book={editing === "new" ? undefined : editing} onOpenChange={(o) => !o && setEditing(null)} />}
      {openId && <BookDetailDialog id={openId} canManage={canManage} onOpenChange={(o) => !o && setOpenId(null)} />}
    </div>
  );
}
