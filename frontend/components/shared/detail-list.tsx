import { cn } from "@/lib/utils";

export interface DetailItem {
  label: string;
  value: React.ReactNode;
}

/** Label/value pairs (semantic <dl>). Empty values render as an em dash. */
export function DetailList({ items, className }: { items: DetailItem[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map(({ label, value }) => {
        const empty = value === null || value === undefined || value === "";
        return (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm">{empty ? <span className="text-muted-foreground">—</span> : value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
