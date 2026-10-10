"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { MyFeesPage } from "@/features/finance/components/my-fees-page";

export default function FeesRoute() {
  return <RoleSwitch views={{ STUDENT: <MyFeesPage /> }} />;
}
