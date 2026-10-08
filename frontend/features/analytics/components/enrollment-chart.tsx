"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { useEnrollmentByProgram } from "../hooks";
import { ChartCard, ChartDataTable } from "./chart-card";
import { ChartTooltip } from "./chart-tooltip";

const TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };

export function EnrollmentChart() {
  const q = useEnrollmentByProgram();
  const data = q.data ?? [];
  const height = Math.max(220, data.length * 44);

  return (
    <ChartCard
      title="Students by program"
      description="Active students per program"
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={() => q.refetch()}
      isEmpty={data.length === 0}
      emptyMessage="No programs have been set up yet"
    >
      <div role="img" aria-label="Bar chart of active students per program. The data is also available as a table.">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="code" tick={TICK} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(code) => data.find((d) => d.code === code)?.name ?? code}
                  valueFormatter={(v) => formatNumber(v)}
                />
              }
            />
            <Bar dataKey="students" name="Students" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Active students per program"
        headers={["Program", "Code", "Students"]}
        rows={data.map((d) => [d.name, d.code, formatNumber(d.students)])}
      />
    </ChartCard>
  );
}
