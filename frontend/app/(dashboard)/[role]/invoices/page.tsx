"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { InvoicesPage } from "@/features/finance/components/invoices-page";

export default function InvoicesRoute() {
  const view = <InvoicesPage />;
  return <RoleSwitch views={{ HEAD_CLERK: view, CLERK: view }} />;
}
