"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { AdmissionsPage } from "@/features/admissions/components/admissions-page";

export default function AdmissionsRoute() {
  return <RoleSwitch views={{ ADMIN: <AdmissionsPage />, HEAD_CLERK: <AdmissionsPage /> }} />;
}
