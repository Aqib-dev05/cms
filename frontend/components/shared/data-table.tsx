"use client";

import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination, type PaginationState } from "./data-table-pagination";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  /** hide this column below the `md` breakpoint to keep phones readable */
  hideOnMobile?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  getRowId: (row: T) => string;
  /** accessible table name (visually hidden) */
  caption: string;
  isLoading?: boolean;
  /** true while refetching with previous data on screen (e.g. changing page) */
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode };
  pagination?: PaginationState;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
  className?: string;
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

export function DataTable<T>({
  columns,
  data,
  getRowId,
  caption,
  isLoading,
  isFetching,
  isError,
  error,
  onRetry,
  empty,
  pagination,
  onRowClick,
  skeletonRows = 6,
  className,
}: DataTableProps<T>) {
  if (isError) return <ErrorState error={error} onRetry={onRetry} />;

  const rows = data ?? [];
  const showEmpty = !isLoading && rows.length === 0;

  if (showEmpty) {
    return (
      <EmptyState
        icon={empty?.icon ?? Inbox}
        title={empty?.title ?? "Nothing here yet"}
        description={empty?.description}
        action={empty?.action}
      />
    );
  }

  const colClass = (c: Column<T>) => cn(ALIGN[c.align ?? "left"], c.hideOnMobile && "hidden md:table-cell", c.className);

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <Table aria-busy={isLoading || isFetching || undefined}>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.id} className={colClass(c)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className={cn("transition-opacity duration-200 motion-reduce:transition-none", isFetching && !isLoading && "opacity-60")}>
          {isLoading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {columns.map((c) => (
                    <TableCell key={c.id} className={colClass(c)}>
                      <Skeleton className="h-4 w-full max-w-[10rem]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  className={cn(onRowClick && "cursor-pointer focus-visible:bg-muted/60")}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((c) => (
                    <TableCell key={c.id} className={colClass(c)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {pagination && !isLoading && <DataTablePagination {...pagination} />}
    </div>
  );
}
