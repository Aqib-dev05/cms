"use client";

import { useState } from "react";
import { CalendarOff, Info } from "lucide-react";
import { z } from "zod";
import { LEAVE_TYPES } from "@/features/staff/types";
import { useRequestLeave } from "@/features/staff/hooks";
import { getErrorMessage } from "@/lib/api";
import { humanize } from "@/lib/format";
import { reqDate, reqText, useZodForm } from "@/lib/form";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z
  .object({ type: z.enum(LEAVE_TYPES), fromDate: reqDate, toDate: reqDate, reason: reqText(500).pipe(z.string().min(5, "Please explain briefly (5+ characters)")) })
  .refine((v) => v.toDate >= v.fromDate, { path: ["toDate"], message: "End date can't be before the start date" });

export function LeavePage() {
  const request = useRequestLeave();
  const [submitted, setSubmitted] = useState<{ days: number } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm(schema, { type: "CASUAL", fromDate: "", toDate: "", reason: "" });

  return (
    <>
      <PageHeader title="My leave" description="Request time off." />
      <div className="mb-6 flex max-w-2xl items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <p>Requests are recorded and sent to the administration. Approval tracking inside the portal isn't available yet, so you'll hear back from your department directly.</p>
      </div>
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => request.mutate(v, { onSuccess: (r) => { setSubmitted({ days: r.days }); reset(); } }))}>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="lv-type" label="Type" required error={errors.type?.message}>
                <Select {...register("type")}>{LEAVE_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select>
              </FormField>
              <FormField id="lv-from" label="From" required error={errors.fromDate?.message}><Input type="date" {...register("fromDate")} /></FormField>
              <FormField id="lv-to" label="To" required error={errors.toDate?.message}><Input type="date" {...register("toDate")} /></FormField>
            </div>
            <FormField id="lv-reason" label="Reason" required error={errors.reason?.message}><Textarea rows={4} {...register("reason")} /></FormField>
            {request.isError && <p role="alert" className="text-sm text-destructive">{getErrorMessage(request.error)}</p>}
            {submitted && !request.isPending && (
              <p role="status" className="flex items-center gap-2 text-sm text-success"><CalendarOff className="h-4 w-4" aria-hidden="true" /> Request submitted for {submitted.days} day{submitted.days === 1 ? "" : "s"}.</p>
            )}
            <div className="flex justify-end"><Button type="submit" loading={request.isPending}>Submit request</Button></div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
