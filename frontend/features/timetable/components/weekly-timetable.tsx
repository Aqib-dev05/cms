"use client";

import { Clock, MapPin } from "lucide-react";
import { DAYS, formatTime } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimetableEntry } from "../types";

interface WeeklyTimetableProps {
  entries: TimetableEntry[];
  /** extra controls per entry (edit / delete) */
  renderActions?: (entry: TimetableEntry) => React.ReactNode;
  /** hide Saturday when nothing is scheduled */
  hideEmptyWeekend?: boolean;
}

/** Day-by-day list of classes (reads well on a phone; 2–3 columns on wide screens). */
export function WeeklyTimetable({ entries, renderActions, hideEmptyWeekend = true }: WeeklyTimetableProps) {
  // JS: Sunday = 0; our days: Mon = 1 … Sat = 6
  const today = new Date().getDay();
  const days = DAYS.filter((d) => !(hideEmptyWeekend && d.value === 6 && !entries.some((e) => e.dayOfWeek === 6)));

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {days.map((day) => {
        const list = entries.filter((e) => e.dayOfWeek === day.value).sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isToday = today === day.value;
        return (
          <Card key={day.value} className={isToday ? "border-primary/60" : undefined}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{day.label}</CardTitle>
              {isToday && <Badge variant="info">Today</Badge>}
            </CardHeader>
            <CardContent>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes</p>
              ) : (
                <ul className="space-y-3">
                  {list.map((e) => (
                    <li key={e.id} className="rounded-md border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{e.title}</p>
                          {e.subtitle && <p className="text-xs text-muted-foreground">{e.subtitle}</p>}
                        </div>
                        {renderActions?.(e)}
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatTime(e.startTime)} – {formatTime(e.endTime)}
                        </span>
                        {e.room && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            {e.room}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
