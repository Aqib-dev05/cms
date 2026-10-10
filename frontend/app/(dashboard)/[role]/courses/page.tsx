"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { MyCoursesPage } from "@/features/students/components/my-courses-page";

export default function CoursesRoute() {
  return <RoleSwitch views={{ STUDENT: <MyCoursesPage /> }} />;
}
