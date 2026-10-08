"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getNav } from "@/config/nav";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardHomePage() {
  const user = useAppSelector(selectUser);
  if (!user) return null;

  const shortcuts = getNav(user.role.name)
    .flatMap((g) => g.items)
    .filter((i) => !i.isHome);

  return (
    <>
      <PageHeader title={`Welcome back, ${user.username}`} description={`Signed in as ${user.role.displayName}`} />

      <section aria-labelledby="quick-access" className="mb-8">
        <h2 id="quick-access" className="mb-3 text-base font-semibold">
          Quick access
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="transition-colors duration-200 group-hover:border-primary/50 group-hover:bg-accent/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 font-medium">{label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <EmptyState
        icon={Sparkles}
        title="Your dashboard is being set up"
        description="Stats, charts and recent activity will appear here as each module's screens are built."
      />
    </>
  );
}
