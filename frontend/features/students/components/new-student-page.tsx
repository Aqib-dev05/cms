"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { usePrograms } from "@/features/academic/hooks";
import { getErrorMessage } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useCreateStudent } from "../hooks";
import { mapServerError, type StudentFormValues } from "../schema";
import { StudentForm } from "./student-form";

export function NewStudentPage({ basePath, canCreate }: { basePath: string; canCreate: boolean }) {
  const router = useRouter();
  const programs = usePrograms();
  const create = useCreateStudent();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<ReturnType<typeof mapServerError>>(null);

  if (!canCreate) {
    return (
      <>
        <PageHeader title="Add student" />
        <EmptyState icon={ShieldAlert} title="You can't add students" description="Ask an administrator if a student needs to be registered." />
      </>
    );
  }

  const submit = (values: StudentFormValues) => {
    setServerError(null);
    setFieldError(null);
    create.mutate(values, {
      onSuccess: (student) => {
        toast.success(`${student.studentProfile.firstName} ${student.studentProfile.lastName} added — ${student.studentProfile.registrationNo}`);
        router.push(`${basePath}/students/${student.id}`);
      },
      onError: (err) => {
        const message = getErrorMessage(err, "Could not create the student.");
        const mapped = mapServerError(message);
        if (mapped) setFieldError({ ...mapped });
        else setServerError(message);
      },
    });
  };

  return (
    <>
      <PageHeader title="Add student" description="Create the student's record and login in one step." />
      <div className="max-w-3xl">
        <StudentForm
          programs={programs.data ?? []}
          programsLoading={programs.isLoading}
          onSubmit={submit}
          isSubmitting={create.isPending}
          serverError={serverError ?? (programs.isError ? "Couldn't load programs. Reload the page to try again." : null)}
          serverFieldError={fieldError}
          cancelHref={`${basePath}/students`}
        />
      </div>
    </>
  );
}
