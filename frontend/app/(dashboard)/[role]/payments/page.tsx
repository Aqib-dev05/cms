"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { PaymentsPage } from "@/features/finance/components/payments-page";

export default function PaymentsRoute() {
  const view = <PaymentsPage />;
  return <RoleSwitch views={{ HEAD_CLERK: view, CLERK: view }} />;
}
