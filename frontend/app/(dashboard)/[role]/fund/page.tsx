"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { FundPage } from "@/features/fund/components/fund-page";

export default function FundRoute() {
  const view = <FundPage />;
  return <RoleSwitch views={{ HEAD_CLERK: view, CLERK: view, ADMIN: view }} />;
}
