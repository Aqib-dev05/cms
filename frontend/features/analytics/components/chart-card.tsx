import { BarChart3 } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  children: React.ReactNode;
}

/** Card with consistent loading / error / empty handling around a chart. */
export function ChartCard({ title, description, isLoading, isError, error, onRetry, isEmpty, emptyMessage = "No data yet", className, children }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState error={error} onRetry={onRetry} title="Couldn't load this chart" className="py-8" />
        ) : isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : isEmpty ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart3 className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** Screen-reader alternative to a chart: the same numbers as a table. */
export function ChartDataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
