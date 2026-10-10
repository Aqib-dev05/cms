"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { ComplaintDetailPage } from "@/features/complaints/components/complaint-detail-page";

export default function ComplaintDetailRoute({ params }: { params: { id: string } }) {
  const view = <ComplaintDetailPage id={params.id} />;
  return <RoleSwitch views={{ ADMIN: view, COMPLAINT_OFFICER: view, STUDENT: view, HOD: view, HEAD_CLERK: view, LIBRARIAN: view }} />;
}
