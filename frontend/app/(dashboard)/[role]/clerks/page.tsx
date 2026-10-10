"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { StaffListPage } from "@/features/staff/components/staff-list-page";

export default function ClerksRoute() {
  return <RoleSwitch views={{ HEAD_CLERK: <StaffListPage basePath="/clerk" title="Clerks" description="Fee-collection clerks. Accounts are created by the administrator." fixedRole="CLERK" linkRows={false} /> }} />;
}
