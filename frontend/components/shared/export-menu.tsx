"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { downloadFile } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  /** export key on the API, e.g. "invoices", "my-fees" (see GET /export) */
  resource: string;
  /** current filters — undefined / empty values are dropped */
  params?: Record<string, string | undefined>;
  label?: string;
  disabled?: boolean;
}

/** "Export" button: choose Excel or PDF; the server only allows what the user's role may see. */
export function ExportMenu({ resource, params, label = "Export", disabled }: ExportMenuProps) {
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const run = async (format: "xlsx" | "pdf") => {
    setBusy(format);
    try {
      const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ""));
      await downloadFile(`/export/${resource}`, { ...clean, format }, `${resource}.${format}`);
    } catch (err) {
      toast.error(await readableError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled} loading={busy !== null}>
          <Download aria-hidden="true" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void run("xlsx")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void run("pdf")}>
          <FileText className="mr-2 h-4 w-4" aria-hidden="true" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Blob responses hide the JSON error body — read it back so "Forbidden" etc. show properly. */
async function readableError(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      /* fall through */
    }
  }
  return getErrorMessage(err);
}
