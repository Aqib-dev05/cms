"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { InvoiceDetailPage } from "@/features/finance/components/invoice-detail-page";

export default function FinanceInvoiceRoute({ params }: { params: { id: string } }) {
  return <RoleSwitch views={{ ADMIN: <InvoiceDetailPage id={params.id} /> }} />;
}
