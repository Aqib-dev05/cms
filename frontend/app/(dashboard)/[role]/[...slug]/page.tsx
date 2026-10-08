"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Hammer } from "lucide-react";
import { titleCase } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

/** Placeholder for every module screen that hasn't been built yet. */
export default function ComingSoonPage() {
  const params = useParams<{ role: string; slug: string[] }>();
  const slug = params.slug ?? [];
  const title = titleCase(slug[slug.length - 1] ?? "Page");

  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={Hammer}
        title="This section is under construction"
        description="The backend for this module is ready — the screen is coming soon."
        action={
          <Button asChild variant="outline">
            <Link href={`/${params.role}`}>Back to dashboard</Link>
          </Button>
        }
      />
    </>
  );
}
