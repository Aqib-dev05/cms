"use client";

import { useState } from "react";
import { Check, Copy, FilterX, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { usePrograms } from "@/features/academic/hooks";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatDateTime, humanize } from "@/lib/format";
import { usePageState } from "@/hooks/use-page-state";
import { useRole } from "@/hooks/use-role";
import { DataTable, type Column } from "@/components/shared/data-table";
import { DetailList } from "@/components/shared/detail-list";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApplication, useApplications, useEnrollApplicant, useReviewApplication } from "../hooks";
import { APPLICATION_STATUSES, REVIEW_STATUSES, type Application, type ApplicationStatus, type EnrollResult } from "../types";

function ReviewDialog({ id, onOpenChange }: { id: string; onOpenChange: (o: boolean) => void }) {
  const review = useReviewApplication();
  const [status, setStatus] = useState<string>("APPROVED");
  const [remarks, setRemarks] = useState("");
  return (
    <FormDialog open onOpenChange={onOpenChange} title="Review application" onSubmit={(e) => { e.preventDefault(); review.mutate({ id, status, remarks: remarks.trim() || undefined }, { onSuccess: () => onOpenChange(false) }); }} isSubmitting={review.isPending} error={review.isError ? getErrorMessage(review.error) : null} submitLabel="Save decision" destructive={status === "REJECTED"}>
      <div className="space-y-2">
        <Label htmlFor="rv-status">Decision</Label>
        <Select id="rv-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rv-remarks">Remarks (optional)</Label>
        <Textarea id="rv-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} />
      </div>
    </FormDialog>
  );
}

function CredentialsDialog({ result, onClose }: { result: EnrollResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Username: ${result.user.username}\nTemporary password: ${result.tempPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the text manually.");
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Student enrolled</DialogTitle>
          <DialogDescription>Registration no. {result.student.registrationNo}. Share these login details with the student — the password is shown only now.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
          <p><span className="text-muted-foreground">Username: </span><code className="font-semibold">{result.user.username}</code></p>
          <p><span className="text-muted-foreground">Temporary password: </span><code className="font-semibold">{result.tempPassword}</code></p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={copy}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? "Copied" : "Copy details"}</Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDialog({ id, onOpenChange }: { id: string; onOpenChange: (o: boolean) => void }) {
  const { role } = useRole();
  const q = useApplication(id);
  const enroll = useEnrollApplicant();
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<EnrollResult | null>(null);
  const a = q.data;
  const canReview = role === "ADMIN";
  const canEnroll = (role === "ADMIN" || role === "HEAD_CLERK") && !!a && !a.studentProfile && (a.status === "APPROVED" || a.status === "SHORTLISTED");
  const finalised = a?.status === "ENROLLED" || a?.status === "REJECTED";

  return (
    <>
      <Dialog open={!result} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{a ? `${a.firstName} ${a.lastName}` : "Application"}</DialogTitle>
            <DialogDescription>{a ? `${a.applicationNo} · ${a.program.name}` : "Loading…"}</DialogDescription>
          </DialogHeader>
          {q.isLoading ? <Skeleton className="h-48" /> : q.isError || !a ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
            <>
              <div className="flex items-center gap-3"><StatusBadge status={a.status} />{a.remarks && <span className="text-sm text-muted-foreground">“{a.remarks}”</span>}</div>
              <DetailList items={[
                { label: "Father's name", value: a.fatherName },
                { label: "Email", value: a.email },
                { label: "Phone", value: a.phone },
                { label: "CNIC", value: a.cnic },
                { label: "Gender", value: a.gender && humanize(a.gender) },
                { label: "Date of birth", value: a.dateOfBirth && formatDate(a.dateOfBirth) },
                { label: "Address", value: a.address },
                { label: "Department", value: a.program.department.name },
                { label: "Submitted", value: a.submittedAt && formatDateTime(a.submittedAt) },
                { label: "Student account", value: a.studentProfile ? `${a.studentProfile.registrationNo} (@${a.studentProfile.user.username})` : null },
              ]} />
              {a.documents.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Documents</h3>
                  <ul className="space-y-1 text-sm">
                    {a.documents.map((d) => <li key={d.id}><a className="underline-offset-4 hover:underline" href={d.media.url} target="_blank" rel="noopener noreferrer">{d.media.originalName ?? d.media.fileName ?? "Document"}</a></li>)}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-semibold">History</h3>
                <ol className="space-y-2 border-l pl-4 text-sm">
                  {a.statusHistory.map((h) => (
                    <li key={h.id}><span className="font-medium">{humanize(h.toStatus)}</span> <span className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</span>{h.note && <p className="text-muted-foreground">{h.note}</p>}</li>
                  ))}
                </ol>
              </div>
              {enroll.isError && <p role="alert" className="text-sm text-destructive">{getErrorMessage(enroll.error)}</p>}
              <DialogFooter>
                {canReview && !finalised && <Button variant="outline" onClick={() => setReviewing(true)}>Review</Button>}
                {canEnroll && <Button loading={enroll.isPending} onClick={() => enroll.mutate(a.id, { onSuccess: setResult })}><UserPlus aria-hidden="true" /> Enroll student</Button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {reviewing && <ReviewDialog id={id} onOpenChange={(o) => !o && setReviewing(false)} />}
      {result && <CredentialsDialog result={result} onClose={() => { setResult(null); onOpenChange(false); }} />}
    </>
  );
}

export function AdmissionsPage() {
  const { page, limit, params, setPage, setLimit, setSearch } = usePageState(20);
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [programId, setProgramId] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const programs = usePrograms();
  const q = useApplications({ ...params, status: status || undefined, programId: programId || undefined });
  const filtersActive = !!(status || programId || params.search);

  const columns: Column<Application>[] = [
    { id: "no", header: "Application", cell: (a) => <div><p className="font-medium tabular-nums">{a.applicationNo}</p><p className="text-xs text-muted-foreground">{a.firstName} {a.lastName}</p></div> },
    { id: "program", header: "Program", hideOnMobile: true, cell: (a) => a.program.code },
    { id: "email", header: "Email", hideOnMobile: true, cell: (a) => a.email },
    { id: "date", header: "Applied", hideOnMobile: true, cell: (a) => formatDate(a.submittedAt ?? a.createdAt) },
    { id: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <>
      <PageHeader title="Admissions" description="Review applications and enroll approved applicants." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput key={searchKey} onSearch={setSearch} placeholder="Name, email, CNIC or application no." label="Search applications" className="sm:max-w-sm" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as ApplicationStatus | ""); setPage(1); }} className="sm:w-44">
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
        <Select aria-label="Filter by program" value={programId} onChange={(e) => { setProgramId(e.target.value); setPage(1); }} className="sm:w-52" disabled={programs.isLoading}>
          <option value="">All programs</option>
          {programs.data?.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
        </Select>
        {filtersActive && <Button variant="ghost" size="sm" onClick={() => { setStatus(""); setProgramId(""); setSearch(""); setSearchKey((k) => k + 1); }}><FilterX aria-hidden="true" /> Clear filters</Button>}
      </div>
      <DataTable caption="Applications" columns={columns} data={q.data?.data} getRowId={(a) => a.id} isLoading={q.isLoading} isFetching={q.isFetching} isError={q.isError} error={q.error} onRetry={() => q.refetch()} onRowClick={(a) => setOpenId(a.id)} empty={{ icon: KeyRound, title: filtersActive ? "No applications match" : "No applications yet", description: filtersActive ? "Try different filters." : "Applications submitted from the public form show up here." }} pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }} />
      {openId && <ApplicationDialog key={openId} id={openId} onOpenChange={(o) => !o && setOpenId(null)} />}
    </>
  );
}
