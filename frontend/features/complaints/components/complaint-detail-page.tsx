"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Lock, Send, UserCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime, humanize } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { useStaffList } from "@/features/staff/hooks";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { useAddComment, useAssignComplaint, useComplaint, useUpdateComplaintStatus } from "../hooks";
import { SETTABLE_COMPLAINT_STATUSES, submitterName } from "../types";

function AssignDialog({ id, onOpenChange }: { id: string; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffList({ page: 1, limit: 50, status: "ACTIVE" });
  const assign = useAssignComplaint();
  const [userId, setUserId] = useState("");
  const [note, setNote] = useState("");
  const rows = (staff.data?.data ?? []).filter((s) => s.role.name !== "STUDENT");
  return (
    <FormDialog open onOpenChange={onOpenChange} title="Assign complaint" description="The assignee is notified straight away." onSubmit={(e) => { e.preventDefault(); if (userId) assign.mutate({ id, assignedToId: userId, note: note.trim() || undefined }, { onSuccess: () => onOpenChange(false) }); }} isSubmitting={assign.isPending} error={assign.isError ? getErrorMessage(assign.error) : null} submitLabel="Assign">
      <div className="space-y-2">
        <Label htmlFor="assign-to">Assign to</Label>
        <Select id="assign-to" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={staff.isLoading}>
          <option value="">{staff.isLoading ? "Loading…" : "Select a staff member"}</option>
          {rows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.staffProfile ? `${s.staffProfile.firstName} ${s.staffProfile.lastName}` : s.username} · {s.role.displayName}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assign-note">Note (optional)</Label>
        <Textarea id="assign-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>
    </FormDialog>
  );
}

function StatusDialog({ id, current, onOpenChange }: { id: string; current: string; onOpenChange: (o: boolean) => void }) {
  const update = useUpdateComplaintStatus();
  const options = SETTABLE_COMPLAINT_STATUSES.filter((s) => s !== current);
  const [status, setStatus] = useState<string>(options[0]);
  const [note, setNote] = useState("");
  return (
    <FormDialog open onOpenChange={onOpenChange} title="Update status" description="The student is notified of the change." onSubmit={(e) => { e.preventDefault(); update.mutate({ id, status, note: note.trim() || undefined }, { onSuccess: () => onOpenChange(false) }); }} isSubmitting={update.isPending} error={update.isError ? getErrorMessage(update.error) : null} submitLabel="Update status">
      <div className="space-y-2">
        <Label htmlFor="cs-status">New status</Label>
        <Select id="cs-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {options.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-note">Note (optional)</Label>
        <Textarea id="cs-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Explain the decision or next step" />
      </div>
    </FormDialog>
  );
}

export function ComplaintDetailPage({ id }: { id: string }) {
  const { role, basePath } = useRole();
  const me = useAppSelector(selectUser);
  const isStudent = role === "STUDENT";
  const canAct = role === "ADMIN" || role === "COMPLAINT_OFFICER" || role === "HOD" || role === "HEAD_CLERK";
  const q = useComplaint(id);
  const addComment = useAddComment();
  const [dialog, setDialog] = useState<"assign" | "status" | null>(null);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);

  const back = (
    <Button variant="outline" asChild>
      <Link href={`${basePath}/complaints`}>
        <ArrowLeft aria-hidden="true" /> All complaints
      </Link>
    </Button>
  );

  if (q.isLoading) return <div aria-busy="true" className="space-y-4"><Skeleton className="h-9 w-72" /><Skeleton className="h-64" /></div>;
  if (q.isError || !q.data) return <><PageHeader title="Complaint" actions={back} /><ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load this complaint" /></>;

  const c = q.data;
  // internal staff notes must never be shown to the student who filed the complaint
  const comments = c.comments.filter((m) => !(isStudent && m.isInternal));
  const closed = c.status === "CLOSED" || c.status === "REJECTED";

  return (
    <>
      <PageHeader
        title={c.title}
        description={`${c.category.name} · submitted ${formatDateTime(c.createdAt)}${isStudent ? "" : ` by ${submitterName(c)}`}`}
        actions={
          <>
            {back}
            {canAct && !closed && (
              <>
                <Button variant="outline" onClick={() => setDialog("assign")}><UserCheck aria-hidden="true" /> Assign</Button>
                <Button onClick={() => setDialog("status")}>Update status</Button>
              </>
            )}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status} />
        {c.assignedToId && !isStudent && <Badge variant="info">Assigned</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed">{c.description}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No replies yet.</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((m) => {
                    const mine = m.authorId === me?.id;
                    return (
                      <li key={m.id} className={`rounded-lg border p-3 text-sm ${m.isInternal ? "border-warning/50 bg-warning/10" : mine ? "bg-primary/5" : "bg-muted/40"}`}>
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{mine ? "You" : m.authorId === c.createdById ? submitterName(c) : "Staff"}</span>
                          <span>{formatDateTime(m.createdAt)}</span>
                          {m.isInternal && <Badge variant="warning" className="gap-1"><Lock className="h-3 w-3" aria-hidden="true" /> Internal note</Badge>}
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!closed && (
                <form
                  className="space-y-3 border-t pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (text.trim()) addComment.mutate({ id, content: text.trim(), isInternal: internal }, { onSuccess: () => { setText(""); setInternal(false); } });
                  }}
                >
                  <Label htmlFor="comment">Add a reply</Label>
                  <Textarea id="comment" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} />
                  {addComment.isError && <p role="alert" className="text-sm text-destructive">{getErrorMessage(addComment.error)}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {!isStudent ? (
                      <div className="flex items-center gap-2">
                        <Checkbox id="internal" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                        <Label htmlFor="internal">Internal note (hidden from the student)</Label>
                      </div>
                    ) : <span />}
                    <Button type="submit" loading={addComment.isPending} disabled={!text.trim()}><Send aria-hidden="true" /> Send</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l pl-4">
              <li>
                <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-primary" aria-hidden="true" />
                <p className="text-sm font-medium">Submitted</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</p>
              </li>
              {c.statusHistory.map((h) => (
                <li key={h.id}>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-medium">{humanize(h.toStatus)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
                  {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      {dialog === "assign" && <AssignDialog id={id} onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "status" && <StatusDialog id={id} current={c.status} onOpenChange={(o) => !o && setDialog(null)} />}
    </>
  );
}
