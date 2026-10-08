"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function titleCase(slug: string): string {
  if (UUID.test(slug)) return "Details";
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const user = useAppSelector(selectUser);
  const segments = pathname.split("/").filter(Boolean);
  if (!user || segments.length === 0) return null;

  const [base, ...rest] = segments;
  const crumbs = [
    { label: "Home", href: `/${base}` },
    ...rest.map((seg, i) => ({ label: titleCase(seg), href: `/${[base, ...rest.slice(0, i + 1)].join("/")}` })),
  ];
  const current = crumbs[crumbs.length - 1];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      {/* small screens: just the current page */}
      <p className="truncate font-heading text-base font-semibold sm:hidden">{current.label}</p>
      <ol className="hidden items-center gap-1.5 text-sm sm:flex">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
