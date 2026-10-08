"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatCurrency, formatMonthKey } from "@/lib/format";
import { useFeeTrend } from "../hooks";
import { ChartCard, ChartDataTable } from "./chart-card";
import { ChartTooltip } from "./chart-tooltip";

const TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };

export function FeeTrendChart({ months = 6 }: { months?: number }) {
  const q = useFeeTrend(months);
  const data = q.data ?? [];
  const isEmpty = data.every((d) => d.collected === 0 && d.billed === 0);

  return (
    <ChartCard
      title="Fee collection"
      description={`Billed vs collected, last ${months} months`}
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={() => q.refetch()}
      isEmpty={isEmpty}
      emptyMessage="No invoices or payments in this period"
    >
      <div role="img" aria-label={`Bar chart of fees billed and collected per month for the last ${months} months. The data is also available as a table.`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tickFormatter={(m: string) => formatMonthKey(m)} tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={TICK} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              content={<ChartTooltip labelFormatter={(l) => formatMonthKey(l, "long")} valueFormatter={(v) => formatCurrency(v)} />}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="billed" name="Billed" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="collected" name="Collected" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Fees billed and collected per month"
        headers={["Month", "Billed", "Collected"]}
        rows={data.map((d) => [formatMonthKey(d.month, "long"), formatCurrency(d.billed), formatCurrency(d.collected)])}
      />
    </ChartCard>
  );
}
