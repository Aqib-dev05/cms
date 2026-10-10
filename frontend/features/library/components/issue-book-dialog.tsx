"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { StudentPicker, type PickedStudent } from "@/components/shared/student-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { fetchBooks } from "../api";
import { useIssueBook } from "../hooks";
import type { Book } from "../types";

interface IssueBookDialogProps {
  onOpenChange: (o: boolean) => void;
  /** skip the book search when issuing from a book's own page */
  book?: Pick<Book, "id" | "title" | "copies">;
  /** pre-select a copy */
  copyId?: string;
}

export function IssueBookDialog({ onOpenChange, book: fixedBook, copyId: initialCopy }: IssueBookDialogProps) {
  const issue = useIssueBook();
  const [text, setText] = useState("");
  const search = useDebouncedValue(text.trim(), 300);
  const [picked, setPicked] = useState<Pick<Book, "id" | "title" | "copies"> | null>(fixedBook ?? null);
  const [copyId, setCopyId] = useState(initialCopy ?? "");
  const [student, setStudent] = useState<PickedStudent | null>(null);
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [errors, setErrors] = useState<{ copy?: string; student?: string; due?: string }>({});

  const results = useQuery({
    queryKey: queryKeys.library.books({ page: 1, limit: 6, search }),
    queryFn: () => fetchBooks({ page: 1, limit: 6, search }),
    enabled: !fixedBook && !picked && search.length >= 2,
    placeholderData: keepPreviousData,
  });

  const available = picked?.copies.filter((c) => c.status === "AVAILABLE") ?? [];

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = { copy: copyId ? undefined : "Choose a copy", student: student ? undefined : "Choose a student", due: dueDate ? undefined : "Pick a due date" };
    setErrors(next);
    if (next.copy || next.student || next.due || !student) return;
    issue.mutate({ bookCopyId: copyId, studentProfileId: student.profileId, dueDate }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormDialog open onOpenChange={onOpenChange} title="Issue a book" description="Students can borrow up to 3 books at a time." onSubmit={submit} isSubmitting={issue.isPending} error={issue.isError ? getErrorMessage(issue.error) : null} submitLabel="Issue book">
      {!fixedBook && (
        <FormField id="issue-book-search" label="Book" required>
          {picked ? (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-medium">{picked.title}</span>
              <button type="button" className="shrink-0 text-sm underline-offset-4 hover:underline" onClick={() => { setPicked(null); setCopyId(""); }}>Change</button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input id="issue-book-search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Title, author or ISBN" autoComplete="off" />
              {search.length >= 2 && (
                <div className="max-h-48 overflow-y-auto rounded-md border bg-card" role="listbox" aria-label="Matching books">
                  {(results.data?.data ?? []).length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">{results.isLoading ? "Searching…" : "No books found."}</p>
                  ) : (
                    results.data!.data.map((b) => (
                      <button key={b.id} type="button" role="option" aria-selected={false} onClick={() => setPicked(b)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
                        <span className="min-w-0 truncate font-medium">{b.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{b.copies.filter((c) => c.status === "AVAILABLE").length} available</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </FormField>
      )}
      {picked && (
        <FormField id="issue-copy" label="Copy" required error={errors.copy} description={available.length === 0 ? "No copies are available right now." : undefined}>
          <Select value={copyId} onChange={(e) => setCopyId(e.target.value)} disabled={available.length === 0}>
            <option value="">Select a copy</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                Copy {c.copyNumber}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <FormField id="issue-student" label="Student" required error={errors.student}>
        <StudentPicker id="issue-student" value={student} onChange={setStudent} />
      </FormField>
      <FormField id="issue-due" label="Due date" required error={errors.due}>
        <Input type="date" value={dueDate} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDueDate(e.target.value)} />
      </FormField>
    </FormDialog>
  );
}
