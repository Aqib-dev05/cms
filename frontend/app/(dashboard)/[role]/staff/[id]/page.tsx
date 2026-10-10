"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { StaffDetailPage } from "@/features/staff/components/staff-detail-page";

export default function StaffDetailRoute({ params }: { params: { id: string } }) {
  return (
    <RoleSwitch
      views={{
        ADMIN: <StaffDetailPage id={params.id} basePath="/admin" canManage />,
        HOD: <StaffDetailPage id={params.id} basePath="/hod" />,
      }}
    />
  );
}
