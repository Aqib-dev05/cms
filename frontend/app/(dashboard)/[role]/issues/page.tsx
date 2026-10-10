"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { PageHeader } from "@/components/shared/page-header";
import { IssuesPanel } from "@/features/library/components/issues-panel";

export default function IssuesRoute() {
  return (
    <RoleSwitch
      views={{
        LIBRARIAN: (
          <>
            <PageHeader title="Issue & return" description="Lend books, take them back and chase overdue ones." />
            <IssuesPanel />
          </>
        ),
      }}
    />
  );
}
