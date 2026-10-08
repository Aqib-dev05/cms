import { Loader2 } from "lucide-react";

export function FullScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
