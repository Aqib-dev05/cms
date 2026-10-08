import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

interface StatCardProps {
  title: string;
  value?: string | number;
  icon?: LucideIcon;
  tone?: Tone;
  /** small line under the value, e.g. "of 1,240 enrolled" */
  description?: string;
  /** percentage change; sign is shown with an arrow + text (never colour alone) */
  trend?: { value: number; label?: string };
  loading?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, tone = "default", description, trend, loading, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight">{value ?? "—"}</p>
          )}
          {loading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            (description || trend) && (
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {trend && (
                  <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                    {trend.value >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span className="sr-only">{trend.value >= 0 ? "Up" : "Down"} </span>
                    {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ""}
                  </span>
                )}
                {description && <span>{description}</span>}
              </p>
            )
          )}
        </div>
        {Icon && (
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
