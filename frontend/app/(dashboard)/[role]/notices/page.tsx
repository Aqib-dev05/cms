"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { NoticesPage } from "@/features/notices/components/notices-page";

export default function NoticesRoute() {
  const view = <NoticesPage />;
  return <RoleSwitch views={{ ADMIN: view, HOD: view, TEACHER: view, HEAD_CLERK: view, CLERK: view, COMPLAINT_OFFICER: view, LIBRARIAN: view, STUDENT: view }} />;
}
