"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { FinanceReportsPage } from "@/features/finance/components/finance-reports-page";

export default function ReportsRoute() {
  return <RoleSwitch views={{ HEAD_CLERK: <FinanceReportsPage /> }} />;
}
