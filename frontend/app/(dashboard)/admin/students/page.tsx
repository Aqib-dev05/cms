"use client";

import { StudentsListPage } from "@/features/students/components/students-list-page";

export default function AdminStudentsPage() {
  return <StudentsListPage basePath="/admin" canCreate />;
}
