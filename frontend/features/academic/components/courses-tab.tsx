"use client";

import { useState } from "react";
import { BookOpen, CalendarPlus, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/api";
import { optInt, optText, reqText, useZodForm } from "@/lib/form";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { SearchInput } from "@/components/shared/search-input";
import { SemesterPicker, EMPTY_SEMESTER_PICK, type SemesterPickerValue } from "@/components/shared/semester-picker";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAssignCourseToSemester, useCourses, useCreateCourse, useDepartments, useUpdateCourse } from "../hooks";
import type { Course } from "../types";

const schema = z.object({
  name: reqText(100).pipe(z.string().min(2, "At least 2 characters")),
  code: reqText(15).pipe(z.string().min(2, "At least 2 characters")),
  departmentId: z.string().optional(),
  creditHours: optInt(1, 6),
  description: optText(500),
  isElective: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

function CourseDialog({ onOpenChange, course, fixedDepartmentId }: { onOpenChange: (o: boolean) => void; course?: Course; fixedDepartmentId?: string }) {
  const departments = useDepartments();
  const create = useCreateCourse();
  const update = useUpdateCourse();
  const mutation = course ? update : create;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useZodForm(schema, {
    name: course?.name ?? "",
    code: course?.code ?? "",
    departmentId: fixedDepartmentId ?? "",
    creditHours: course ? String(course.creditHours) : "3",
    description: course?.description ?? "",
    isElective: course?.isElective ?? false,
    isActive: course?.isActive ?? true,
  });

  const submit = handleSubmit((v) => {
    const { departmentId, isActive, ...rest } = v;
    if (course) return update.mutate({ id: course.id, ...rest, isActive }, { onSuccess: () => onOpenChange(false) });
    if (!departmentId) return setError("departmentId", { message: "Choose a department" });
    create.mutate({ ...rest, departmentId }, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={course ? "Edit course" : "New course"}
      onSubmit={submit}
      isSubmitting={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : null}
      submitLabel={course ? "Save changes" : "Create course"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="course-name" label="Course name" required error={errors.name?.message} className="sm:col-span-2">
          <Input autoComplete="off" {...register("name")} />
        </FormField>
        <FormField id="course-code" label="Code" required description="e.g. CS101" error={errors.code?.message}>
          <Input autoComplete="off" {...register("code")} />
        </FormField>
        <FormField id="course-credits" label="Credit hours" error={errors.creditHours?.message}>
          <Input type="number" inputMode="numeric" min={1} max={6} {...register("creditHours")} />
        </FormField>
        {!course && !fixedDepartmentId && (
          <FormField id="course-dept" label="Department" required error={errors.departmentId?.message} className="sm:col-span-2">
            <Select {...register("departmentId")} disabled={departments.isLoading}>
              <option value="">Select department</option>
              {departments.data
                ?.filter((d) => d.isActive)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </Select>
          </FormField>
        )}
        <FormField id="course-desc" label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea {...register("description")} />
        </FormField>
        <div className="flex items-center gap-2">
          <Checkbox id="course-elective" {...register("isElective")} />
          <Label htmlFor="course-elective">Elective</Label>
        </div>
        {course && (
          <div className="flex items-center gap-2">
            <Checkbox id="course-active" {...register("isActive")} />
            <Label htmlFor="course-active">Active</Label>
          </div>
        )}
      </div>
    </FormDialog>
  );
}

function AddToSemesterDialog({ course, onOpenChange }: { course: Course; onOpenChange: (o: boolean) => void }) {
  const assign = useAssignCourseToSemester();
  const [pick, setPick] = useState<SemesterPickerValue>(EMPTY_SEMESTER_PICK);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pick.semesterId) assign.mutate({ courseId: course.id, semesterId: pick.semesterId }, { onSuccess: () => onOpenChange(false) });
  };
  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      size="lg"
      title={`Add ${course.code} to a semester`}
      description="Courses must be offered in a semester before sections can be created for them."
      onSubmit={submit}
      isSubmitting={assign.isPending}
      error={assign.isError ? getErrorMessage(assign.error) : null}
      submitLabel="Add to semester"
    >
      <SemesterPicker value={pick} onChange={setPick} />
      {!pick.semesterId && <p className="text-sm text-muted-foreground">Choose a program, session and semester.</p>}
    </FormDialog>
  );
}

interface CoursesTabProps {
  canManage: boolean;
  /** lock the list (and new courses) to one department, e.g. for a HOD */
  fixedDepartmentId?: string;
}

export function CoursesTab({ canManage, fixedDepartmentId }: CoursesTabProps) {
  const departments = useDepartments();
  const [departmentId, setDepartmentId] = useState(fixedDepartmentId ?? "");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const q = useCourses({ departmentId: departmentId || undefined, search: search || undefined, includeInactive: showInactive });
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [semesterFor, setSemesterFor] = useState<Course | null>(null);

  const columns: Column<Course>[] = [
    { id: "code", header: "Code", cell: (c) => <span className="font-medium tabular-nums">{c.code}</span> },
    {
      id: "name",
      header: "Course",
      cell: (c) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{c.name}</span>
          {c.isElective && <Badge variant="outline">Elective</Badge>}
        </div>
      ),
    },
    { id: "dept", header: "Department", hideOnMobile: true, cell: (c) => c.department.code },
    { id: "credits", header: "Credits", align: "center", cell: (c) => c.creditHours },
    { id: "sections", header: "Sections", align: "center", hideOnMobile: true, cell: (c) => c._count?.sections ?? 0 },
    { id: "status", header: "Status", hideOnMobile: true, cell: (c) => <StatusBadge status={c.isActive ? "ACTIVE" : "RETIRED"} /> },
  ];
  if (canManage) {
    columns.push({
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setSemesterFor(c)} aria-label={`Add ${c.code} to a semester`}>
            <CalendarPlus aria-hidden="true" /> <span className="hidden lg:inline">Semester</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}>
            <Pencil aria-hidden="true" /> <span className="hidden lg:inline">Edit</span>
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput onSearch={setSearch} placeholder="Course name or code" label="Search courses" className="sm:max-w-xs" />
        {!fixedDepartmentId && (
          <Select aria-label="Filter by department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="sm:w-56" disabled={departments.isLoading}>
            <option value="">All departments</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id="courses-inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          <Label htmlFor="courses-inactive">Show inactive</Label>
        </div>
        {canManage && (
          <Button className="sm:ml-auto" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New course
          </Button>
        )}
      </div>
      <DataTable
        caption="Courses"
        columns={columns}
        data={q.data}
        getRowId={(c) => c.id}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        empty={{ icon: BookOpen, title: search || departmentId ? "No courses match these filters" : "No courses yet", description: canManage && !search ? "Add courses, then offer them in a semester." : undefined }}
      />
      {editing && <CourseDialog key={editing === "new" ? "new" : editing.id} onOpenChange={(o) => !o && setEditing(null)} course={editing === "new" ? undefined : editing} fixedDepartmentId={fixedDepartmentId} />}
      {semesterFor && <AddToSemesterDialog key={semesterFor.id} course={semesterFor} onOpenChange={(o) => !o && setSemesterFor(null)} />}
    </div>
  );
}
