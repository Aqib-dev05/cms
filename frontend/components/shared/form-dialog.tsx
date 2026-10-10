"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  /** pass react-hook-form's `handleSubmit(onValid)` */
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isSubmitting?: boolean;
  /** general (non-field) error shown above the buttons */
  error?: string | null;
  destructive?: boolean;
  size?: "md" | "lg" | "xl";
  children: React.ReactNode;
}

/** Modal form shell: title, fields, error banner, Cancel / Submit. Blocks closing while submitting. */
export function FormDialog({ open, onOpenChange, title, description, submitLabel = "Save", onSubmit, isSubmitting, error, destructive, size = "md", children }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {children}
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} loading={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
