"use client";

import Link from "next/link";
import { CalendarDays, Megaphone } from "lucide-react";
import { useNotices } from "@/features/notices/hooks";
import { visibleTo } from "@/features/notices/components/notices-page";
import { formatDate } from "@/lib/format";
import { formatTime } from "@/lib/constants";
import { useRole } from "@/hooks/use-role";
import type { TimetableEntry } from "@/features/timetable/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TodaysClasses({ entries, loading }: { entries?: TimetableEntry[]; loading?: boolean }) {
  const { basePath } = useRole();
  const today = new Date().getDay();
  const list = (entries ?? []).filter((e) => e.dayOfWeek === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" aria-hidden="true" /> Today's classes</CardTitle>
        <Link href={`${basePath}/timetable`} className="text-sm text-primary underline-offset-4 hover:underline">Full timetable</Link>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-20" /> : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{today === 0 ? "No classes on Sunday." : "No classes scheduled today."}</p>
        ) : (
          <ul className="divide-y">
            {list.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{e.title}</p>{e.subtitle && <p className="text-xs text-muted-foreground">{e.subtitle}{e.room ? ` · ${e.room}` : ""}</p>}</div>
                <span className="shrink-0 tabular-nums text-muted-foreground">{formatTime(e.startTime)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function LatestNotices() {
  const { role, basePath } = useRole();
  const q = useNotices({ page: 1, limit: 5, active: true });
  const list = (q.data?.data ?? []).filter((n) => visibleTo(role, n)).slice(0, 4);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" aria-hidden="true" /> Latest notices</CardTitle>
        <Link href={`${basePath}/notices`} className="text-sm text-primary underline-offset-4 hover:underline">All notices</Link>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <Skeleton className="h-20" /> : list.length === 0 ? <p className="text-sm text-muted-foreground">No notices right now.</p> : (
          <ul className="divide-y">
            {list.map((n) => (
              <li key={n.id} className="py-2 text-sm"><p className="font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.publishedAt ? formatDate(n.publishedAt) : ""}</p></li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
