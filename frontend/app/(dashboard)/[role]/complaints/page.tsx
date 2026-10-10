"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { ComplaintsPage } from "@/features/complaints/components/complaints-page";

export default function ComplaintsRoute() {
  const view = <ComplaintsPage />;
  return <RoleSwitch views={{ ADMIN: view, COMPLAINT_OFFICER: view, STUDENT: view, HOD: view, HEAD_CLERK: view, LIBRARIAN: view }} />;
}
