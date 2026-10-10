"use client";

import { useState } from "react";
import { Layers, Plus, Settings2, Trash2 } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { humanize } from "@/lib/format";
import { optInt, reqId, reqText, useZodForm } from "@/lib/form";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { SemesterPicker, EMPTY_SEMESTER_PICK, type SemesterPickerValue } from "@/components/shared/semester-picker";
import { TeacherSelect } from "@/components/shared/teacher-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAssignTeacher, useCourses, useCreateSection, useRemoveTeacher, useSections, useUpdateSection } from "../hooks";
import { personName, type Section } from "../types";

const createSchema = z.object({ courseId: reqId("Choose a course"), name: reqText(10), capacity: optInt(1, 200) });

function CreateSectionDialog({ semesterId, onOpenChange }: { semesterId: string; onOpenChange: (o: boolean) => void }) {
  const courses = useCourses({ semesterId });
  const create = useCreateSection();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(createSchema, { courseId: "", name: "", capacity: "40" });
  const submit = handleSubmit((v) => create.mutate({ semesterId, ...v }, { onSuccess: () => onOpenChange(false) }));

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="New section"
      description="Only courses already offered in the selected semester are listed."
      onSubmit={submit}
      isSubmitting={create.isPending}
      error={create.isError ? getErrorMessage(create.error) : null}
      submitLabel="Create section"
    >
      <FormField id="sec-course" label="Course" required error={errors.courseId?.message}>
        <Select {...register("courseId")} disabled={courses.isLoading}>
          <option value="">{courses.isLoading ? "Loading…" : courses.data?.length ? "Select a course" : "No courses in this semester"}</option>
          {courses.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="sec-name" label="Section name" required description='e.g. "A" or "CS-A"' error={errors.name?.message}>
          <Input autoComplete="off" {...register("name")} />
        </FormField>
        <FormField id="sec-cap" label="Capacity" error={errors.capacity?.message}>
          <Input type="number" inputMode="numeric" min={1} max={200} {...register("capacity")} />
        </FormField>
      </div>
    </FormDialog>
  );
}

function ManageSectionDialog({ sectionId, semesterId, onOpenChange }: { sectionId: string; semesterId: string; onOpenChange: (o: boolean) => void }) {
  // same query as the table behind it → cached, and edits show up straight after invalidation
  const list = useSections({ semesterId });
  const section = list.data?.find((s) => s.id === sectionId);
  const assign = useAssignTeacher();
  const remove = useRemoveTeacher();
  const update = useUpdateSection();
  const [teacherId, setTeacherId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [capacity, setCapacity] = useState<string | null>(null);

  if (!section) return null;
  const cap = capacity ?? String(section.capacity);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {section.course.code} · Section {section.name}
          </DialogTitle>
          <DialogDescription>
            {section.course.name} — Semester {section.semester.semesterNumber} ({humanize(section.semester.type)}) · {section._count?.enrollments ?? 0} enrolled
          </DialogDescription>
        </DialogHeader>

        <section aria-labelledby="teachers-h" className="space-y-3">
          <h3 id="teachers-h" className="text-sm font-semibold">
            Teachers
          </h3>
          {section.teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher assigned yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {section.teachers.map((t) => (
                <li key={t.staffProfileId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{personName(t.staffProfile)}</p>
                    <p className="text-xs text-muted-foreground">{t.staffProfile.designation ?? "Faculty"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.isPrimary && <Badge variant="info">Primary</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${personName(t.staffProfile)}`}
                      onClick={() => remove.mutate({ sectionId, staffProfileId: t.staffProfileId })}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (teacherId) assign.mutate({ sectionId, staffProfileId: teacherId, isPrimary }, { onSuccess: () => setTeacherId("") });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="assign-teacher">Add a teacher</Label>
              <TeacherSelect id="assign-teacher" value={teacherId} onChange={setTeacherId} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox id="assign-primary" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
              <Label htmlFor="assign-primary">Primary</Label>
            </div>
            <Button type="submit" loading={assign.isPending} disabled={!teacherId}>
              Assign
            </Button>
          </form>
          {assign.isError && (
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(assign.error)}
            </p>
          )}
        </section>

        <section aria-labelledby="cap-h" className="space-y-3">
          <h3 id="cap-h" className="text-sm font-semibold">
            Capacity
          </h3>
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(cap);
              if (Number.isInteger(n) && n >= 1 && n <= 200) update.mutate({ id: sectionId, capacity: n });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="cap-input">Seats</Label>
              <Input id="cap-input" type="number" inputMode="numeric" min={1} max={200} value={cap} onChange={(e) => setCapacity(e.target.value)} className="w-28" />
            </div>
            <Button type="submit" variant="outline" loading={update.isPending} disabled={Number(cap) === section.capacity}>
              Update
            </Button>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  );
}

export function SectionsTab({ canManage }: { canManage: boolean }) {
  const [pick, setPick] = useState<SemesterPickerValue>(EMPTY_SEMESTER_PICK);
  const q = useSections({ semesterId: pick.semesterId }, !!pick.semesterId);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<string | null>(null);

  const columns: Column<Section>[] = [
    { id: "course", header: "Course", cell: (s) => <div><span className="font-medium tabular-nums">{s.course.code}</span><p className="text-xs text-muted-foreground">{s.course.name}</p></div> },
    { id: "section", header: "Section", cell: (s) => s.name },
    {
      id: "teachers",
      header: "Teachers",
      hideOnMobile: true,
      cell: (s) => (s.teachers.length ? s.teachers.map((t) => personName(t.staffProfile)).join(", ") : <span className="text-muted-foreground">Unassigned</span>),
    },
    { id: "enrolled", header: "Enrolled", align: "center", cell: (s) => <span className="tabular-nums">{s._count?.enrollments ?? 0} / {s.capacity}</span> },
  ];
  if (canManage) {
    columns.push({
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (s) => (
        <Button variant="ghost" size="sm" onClick={() => setManaging(s.id)} aria-label={`Manage ${s.course.code} section ${s.name}`}>
          <Settings2 aria-hidden="true" /> <span className="hidden sm:inline">Manage</span>
        </Button>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <SemesterPicker value={pick} onChange={setPick} />
      {!pick.semesterId ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Choose a program, session and semester to see its sections.</p>
      ) : (
        <>
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" /> New section
              </Button>
            </div>
          )}
          <DataTable
            caption="Sections"
            columns={columns}
            data={q.data}
            getRowId={(s) => s.id}
            isLoading={q.isLoading}
            isError={q.isError}
            error={q.error}
            onRetry={() => q.refetch()}
            empty={{ icon: Layers, title: "No sections in this semester", description: canManage ? "Offer a course in this semester, then create its sections here." : undefined }}
          />
        </>
      )}
      {creating && <CreateSectionDialog semesterId={pick.semesterId} onOpenChange={(o) => !o && setCreating(false)} />}
      {managing && <ManageSectionDialog sectionId={managing} semesterId={pick.semesterId} onOpenChange={(o) => !o && setManaging(null)} />}
    </div>
  );
}
