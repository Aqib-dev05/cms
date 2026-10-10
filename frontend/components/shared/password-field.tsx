"use client";

import { forwardRef, useState } from "react";
import { Dices, Eye, EyeOff } from "lucide-react";
import { generatePassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";

interface PasswordFieldProps extends Omit<InputProps, "type"> {
  /** show a "Generate" button; it calls this with the new password */
  onGenerate?: (password: string) => void;
}

/** Password input with show/hide and an optional "Generate" button. Pair with <FormField>. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(({ onGenerate, className, ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input ref={ref} type={show ? "text" : "password"} autoComplete="new-password" className={`pr-11 ${className ?? ""}`} {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {onGenerate && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onGenerate(generatePassword());
            setShow(true); // so it can be read out / copied
          }}
        >
          <Dices aria-hidden="true" /> Generate
        </Button>
      )}
    </div>
  );
});
PasswordField.displayName = "PasswordField";
