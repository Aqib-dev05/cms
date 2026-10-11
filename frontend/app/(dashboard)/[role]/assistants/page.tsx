"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { AssistantsPage } from "@/features/clerk/components/assistants-page";

export default function AssistantsRoute() {
  return <RoleSwitch views={{ HEAD_CLERK: <AssistantsPage /> }} />;
}
