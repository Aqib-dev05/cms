"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { StaffListPage } from "@/features/staff/components/staff-list-page";

export default function StaffPage() {
  return (
    <RoleSwitch
      views={{
        ADMIN: <StaffListPage basePath="/admin" description="Faculty and employees across every department." />,
        HOD: <StaffListPage basePath="/hod" linkRows description="Faculty in the college. Filter by your department." />,
      }}
    />
  );
}
