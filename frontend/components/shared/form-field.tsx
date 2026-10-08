import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  /** id given to the control; also used for the label's `htmlFor` */
  id: string;
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  /** exactly one control (Input, Select, Textarea, ...) */
  children: React.ReactElement;
}

/**
 * Label + control + hint/error, wired for accessibility:
 * injects `id`, `aria-invalid` and `aria-describedby` into the child control.
 */
export function FormField({ id, label, error, description, required, className, children }: FormFieldProps) {
  const descId = description && !error ? `${id}-description` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {React.cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      } as React.HTMLAttributes<HTMLElement>)}
      {description && !error && (
        <p id={descId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
