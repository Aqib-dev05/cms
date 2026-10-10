"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { FeeStructuresPage } from "@/features/finance/components/fee-structures-page";

export default function FeeStructuresRoute() {
  return <RoleSwitch views={{ ADMIN: <FeeStructuresPage />, HEAD_CLERK: <FeeStructuresPage /> }} />;
}
