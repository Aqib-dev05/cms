"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-border bg-card text-card-foreground shadow-lg rounded-lg",
          description: "text-muted-foreground",
          closeButton: "border-border bg-card text-card-foreground",
        },
      }}
      {...props}
    />
  );
}
