"use client";

import { StudentDetailPage } from "@/features/students/components/student-detail-page";

export default function ClerkStudentDetailPage({ params }: { params: { id: string } }) {
  return <StudentDetailPage id={params.id} basePath="/clerk" />;
}
