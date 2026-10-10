"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { MyClassesPage } from "@/features/teaching/components/my-classes-page";

export default function ClassesRoute() {
  return <RoleSwitch views={{ TEACHER: <MyClassesPage />, HOD: <MyClassesPage /> }} />;
}
