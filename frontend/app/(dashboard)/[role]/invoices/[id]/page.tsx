"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { InvoiceDetailPage } from "@/features/finance/components/invoice-detail-page";

export default function InvoiceDetailRoute({ params }: { params: { id: string } }) {
  const view = <InvoiceDetailPage id={params.id} />;
  return <RoleSwitch views={{ HEAD_CLERK: view, CLERK: view }} />;
}
