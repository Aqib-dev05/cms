"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { AuditPage } from "@/features/audit/components/audit-page";

export default function AuditRoute() {
  return <RoleSwitch views={{ ADMIN: <AuditPage /> }} />;
}
