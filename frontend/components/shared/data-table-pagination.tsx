"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZES } from "@/lib/pagination";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function DataTablePagination({ page, limit, total, totalPages, onPageChange, onLimitChange }: PaginationState) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const lastPage = Math.max(totalPages, 1);

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground tabular-nums">{formatNumber(from)}–{formatNumber(to)}</span> of{" "}
        <span className="font-medium text-foreground tabular-nums">{formatNumber(total)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onLimitChange && (
          <label className="flex items-center gap-2 text-muted-foreground">
            <span>Rows</span>
            <Select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="h-9 w-[4.5rem]" aria-label="Rows per page">
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
        )}
        <span className="tabular-nums text-muted-foreground">
          Page {page} of {lastPage}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage} aria-label="Next page">
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
