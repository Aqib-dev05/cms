"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import type { RoleName } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

type RoleMap = Partial<Record<RoleName, React.ReactNode>>;

/**
 * One route file, different screen per role:
 *   <RoleSwitch views={{ ADMIN: <A/>, TEACHER: <B/> }} />
 * Roles without an entry see a friendly "not available" state.
 */
export function RoleSwitch({ views }: { views: RoleMap }) {
  const { role, basePath } = useRole();
  if (!role) return null;
  const view = views[role];
  if (view) return <>{view}</>;
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Not available for your role"
      description="This page isn't part of your workspace."
      action={
        <Button asChild variant="outline">
          <Link href={basePath}>Back to dashboard</Link>
        </Button>
      }
    />
  );
}
