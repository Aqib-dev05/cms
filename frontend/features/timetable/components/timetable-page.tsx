"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { DAYS } from "@/lib/constants";
import { optText, reqText, useZodForm } from "@/lib/form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { SectionSelect } from "@/components/shared/section-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateSlot, useDeleteSlot, useMyTeachingTimetable, useMyTimetable, useSectionTimetable, useUpdateSlot } from "../hooks";
import type { TimetableEntry } from "../types";
import { WeeklyTimetable } from "./weekly-timetable";

function TimetableSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}

/** Student / teacher: read-only weekly view. */
export function MyTimetablePage({ kind }: { kind: "student" | "teaching" }) {
  const student = useMyTimetable();
  const teaching = useMyTeachingTimetable();
  const q = kind === "student" ? student : teaching;
  return (
    <>
      <PageHeader title="Timetable" description={kind === "student" ? "Your weekly class schedule." : "Classes you teach this term."} />
      {q.isLoading ? (
        <TimetableSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data && q.data.length > 0 ? (
        <WeeklyTimetable entries={q.data} />
      ) : (
        <EmptyState icon={CalendarDays} title="Nothing scheduled yet" description="Your timetable will show up here once classes are scheduled." />
      )}
    </>
  );
}

const slotSchema = z
  .object({ dayOfWeek: reqText(1), startTime: reqText(5), endTime: reqText(5), room: optText(50) })
  .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "End time must be after the start time" });

function SlotDialog({ sectionId, entry, onOpenChange }: { sectionId: string; entry?: TimetableEntry; onOpenChange: (o: boolean) => void }) {
  const create = useCreateSlot();
  const update = useUpdateSlot();
  const mutation = entry ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(slotSchema, { dayOfWeek: String(entry?.dayOfWeek ?? 1), startTime: entry?.startTime ?? "", endTime: entry?.endTime ?? "", room: entry?.room ?? "" });
  const submit = handleSubmit((v) => {
    const body = { dayOfWeek: Number(v.dayOfWeek), startTime: v.startTime, endTime: v.endTime, room: v.room };
    if (entry) update.mutate({ id: entry.id, ...body }, { onSuccess: () => onOpenChange(false) });
    else create.mutate({ sectionId, ...body }, { onSuccess: () => onOpenChange(false) });
  });
  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={entry ? "Edit class slot" : "Add class slot"}
      description="The server blocks a slot if the teacher is already teaching another section at that time."
      onSubmit={submit}
      isSubmitting={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : null}
      submitLabel={entry ? "Save changes" : "Add slot"}
    >
      <FormField id="slot-day" label="Day" required error={errors.dayOfWeek?.message}>
        <Select {...register("dayOfWeek")}>
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="slot-start" label="Starts" required error={errors.startTime?.message}>
          <Input type="time" {...register("startTime")} />
        </FormField>
        <FormField id="slot-end" label="Ends" required error={errors.endTime?.message}>
          <Input type="time" {...register("endTime")} />
        </FormField>
      </div>
      <FormField id="slot-room" label="Room" error={errors.room?.message}>
        <Input autoComplete="off" {...register("room")} />
      </FormField>
    </FormDialog>
  );
}

/** Admin: pick a section, then add / edit / remove its weekly slots. */
export function ManageTimetablePage() {
  const [sectionId, setSectionId] = useState("");
  const q = useSectionTimetable(sectionId);
  const remove = useDeleteSlot();
  const [editing, setEditing] = useState<TimetableEntry | "new" | null>(null);
  const [deleting, setDeleting] = useState<TimetableEntry | null>(null);

  const entries: TimetableEntry[] = (q.data ?? []).map((s) => ({ id: s.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, room: s.room, title: "Class slot" }));

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Schedule classes section by section."
        actions={
          sectionId ? (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" /> Add slot
            </Button>
          ) : undefined
        }
      />
      <div className="mb-6 max-w-xl space-y-2">
        <Label htmlFor="tt-section">Section</Label>
        <SectionSelect id="tt-section" value={sectionId} onChange={setSectionId} />
      </div>
      {!sectionId ? (
        <EmptyState icon={CalendarDays} title="Choose a section" description="Pick a section above to see and edit its weekly schedule." />
      ) : q.isLoading ? (
        <TimetableSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No slots yet" description="Add the first class slot for this section." action={<Button onClick={() => setEditing("new")}>Add slot</Button>} />
      ) : (
        <WeeklyTimetable
          entries={entries}
          hideEmptyWeekend
          renderActions={(e) => (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" aria-label="Edit slot" onClick={() => setEditing(e)}>
                <Pencil aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Remove slot" onClick={() => setDeleting(e)}>
                <Trash2 className="text-destructive" aria-hidden="true" />
              </Button>
            </div>
          )}
        />
      )}
      {editing && sectionId && <SlotDialog key={editing === "new" ? "new" : editing.id} sectionId={sectionId} entry={editing === "new" ? undefined : editing} onOpenChange={(o) => !o && setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove this class slot?"
        description="The class will disappear from the timetable of everyone in the section."
        confirmLabel="Remove"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}
