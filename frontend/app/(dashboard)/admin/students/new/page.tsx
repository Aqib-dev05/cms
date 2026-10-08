"use client";

import { NewStudentPage } from "@/features/students/components/new-student-page";

export default function AdminNewStudentPage() {
  return <NewStudentPage basePath="/admin" canCreate />;
}
