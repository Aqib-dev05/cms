import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

interface ChartTooltipProps extends TooltipProps<ValueType, NameType> {
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name: string) => string;
}

/** Theme-aware tooltip (recharts' default ignores our dark mode). */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const title = labelFormatter ? labelFormatter(String(label)) : String(label);
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{title}</p>
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium tabular-nums">{valueFormatter ? valueFormatter(Number(p.value), String(p.name)) : String(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
