"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { ExamDetailPage } from "@/features/exams/components/exam-detail-page";

export default function ExamDetailRoute({ params }: { params: { id: string } }) {
  const view = <ExamDetailPage id={params.id} />;
  return <RoleSwitch views={{ ADMIN: view, HOD: view, TEACHER: view }} />;
}
