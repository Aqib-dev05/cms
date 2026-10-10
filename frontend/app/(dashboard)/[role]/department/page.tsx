"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { MyDepartmentPage } from "@/features/teaching/components/my-department-page";

export default function DepartmentRoute() {
  return <RoleSwitch views={{ HOD: <MyDepartmentPage /> }} />;
}
