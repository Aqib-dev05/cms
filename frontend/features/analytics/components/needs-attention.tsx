"use client";

import Link from "next/link";
import { ArrowRight, BookX, CheckCircle2, ClipboardX, MessageSquareWarning, Receipt, UserPlus, type LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsOverview } from "../types";

interface Item {
  label: string;
  count: number;
  href: string;
  icon: LucideIcon;
}

function buildItems(o: AnalyticsOverview, base: string): Item[] {
  return [
    { label: "Overdue fee invoices", count: o.fees.overdueInvoices, href: `${base}/finance`, icon: Receipt },
    { label: "Students below 75% attendance", count: o.attendance.atRiskStudents, href: `${base}/attendance`, icon: ClipboardX },
    { label: "Open complaints", count: o.complaints.open, href: `${base}/complaints`, icon: MessageSquareWarning },
    { label: "Applications awaiting review", count: o.admissions.pending, href: `${base}/admissions`, icon: UserPlus },
    { label: "Overdue library books", count: o.library.overdue, href: `${base}/library`, icon: BookX },
  ];
}

export function NeedsAttention({ overview, loading, basePath }: { overview?: AnalyticsOverview; loading?: boolean; basePath: string }) {
  const items = overview ? buildItems(overview, basePath).filter((i) => i.count > 0) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs attention</CardTitle>
        <CardDescription>Things waiting on someone right now</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !overview ? (
          <p className="text-sm text-muted-foreground">Unavailable until the numbers above load.</p>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md bg-success/10 p-4 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <span>All clear — nothing needs attention.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(({ label, count, href, icon: Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 rounded-md border p-3 transition-colors duration-200 hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <span className="font-heading text-lg font-semibold tabular-nums">{formatNumber(count)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
