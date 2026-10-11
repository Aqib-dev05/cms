"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { VerificationPage } from "@/features/finance/components/verification-page";

export default function VerificationRoute() {
  const view = <VerificationPage />;
  return <RoleSwitch views={{ HEAD_CLERK: view, CLERK: view, ADMIN: view }} />;
}
