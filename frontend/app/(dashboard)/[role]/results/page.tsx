"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { MyResultsPage } from "@/features/exams/components/my-results-page";

export default function ResultsRoute() {
  return <RoleSwitch views={{ STUDENT: <MyResultsPage /> }} />;
}
