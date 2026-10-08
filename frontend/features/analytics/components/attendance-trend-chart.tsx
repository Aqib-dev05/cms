"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonthKey, formatNumber, formatPercent } from "@/lib/format";
import { useAttendanceTrend } from "../hooks";
import { ChartCard, ChartDataTable } from "./chart-card";
import { ChartTooltip } from "./chart-tooltip";

const TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };
const THRESHOLD = 75; // same as the backend's at-risk threshold

export function AttendanceTrendChart({ months = 6 }: { months?: number }) {
  const q = useAttendanceTrend(months);
  const data = q.data ?? [];
  const isEmpty = data.every((d) => d.rate === null);

  return (
    <ChartCard
      title="Attendance rate"
      description={`Present or late, by month — dashed line is the ${THRESHOLD}% minimum`}
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={() => q.refetch()}
      isEmpty={isEmpty}
      emptyMessage="No attendance has been marked in this period"
    >
      <div role="img" aria-label={`Line chart of the monthly attendance rate for the last ${months} months, with a ${THRESHOLD}% minimum line. The data is also available as a table.`}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tickFormatter={(m: string) => formatMonthKey(m)} tick={TICK} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tick={TICK} tickLine={false} axisLine={false} width={44} />
            <ReferenceLine y={THRESHOLD} stroke="hsl(var(--destructive))" strokeDasharray="5 4" />
            <Tooltip content={<ChartTooltip labelFormatter={(l) => formatMonthKey(l, "long")} valueFormatter={(v) => formatPercent(v)} />} />
            <Line
              type="monotone"
              dataKey="rate"
              name="Attendance"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--chart-1))" }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Attendance rate per month"
        headers={["Month", "Rate", "Records marked"]}
        rows={data.map((d) => [formatMonthKey(d.month, "long"), formatPercent(d.rate), formatNumber(d.records)])}
      />
    </ChartCard>
  );
}
