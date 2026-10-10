"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { UsersPage } from "@/features/users/components/users-page";

export default function UsersRoute() {
  return <RoleSwitch views={{ ADMIN: <UsersPage /> }} />;
}
