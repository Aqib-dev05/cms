import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", collapsed = false, className }: { href?: string; collapsed?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" aria-hidden="true" />
      </span>
      {!collapsed && <span className="font-heading text-lg font-semibold tracking-tight">{siteConfig.name}</span>}
      {collapsed && <span className="sr-only">{siteConfig.name}</span>}
    </Link>
  );
}
