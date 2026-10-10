"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { InvoicesPage } from "@/features/finance/components/invoices-page";

export default function FinanceRoute() {
  return <RoleSwitch views={{ ADMIN: <InvoicesPage showSummary title="Finance" description="Collections, outstanding balances and every invoice." /> }} />;
}
