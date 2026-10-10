"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { LeavePage } from "@/features/leave/components/leave-page";

export default function LeaveRoute() {
  return <RoleSwitch views={{ TEACHER: <LeavePage />, HOD: <LeavePage /> }} />;
}
