"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { ExamsPage } from "@/features/exams/components/exams-page";

export default function ExamsRoute() {
  return <RoleSwitch views={{ ADMIN: <ExamsPage />, HOD: <ExamsPage />, TEACHER: <ExamsPage /> }} />;
}
