"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  /** called with the debounced text */
  onSearch: (value: string) => void;
  placeholder?: string;
  label?: string;
  delayMs?: number;
  className?: string;
}

export function SearchInput({ onSearch, placeholder = "Search…", label = "Search", delayMs = 350, className }: SearchInputProps) {
  const [value, setValue] = useState("");
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false; // don't fire on mount
      return;
    }
    const id = setTimeout(() => onSearchRef.current(value.trim()), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return (
    <div role="search" className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
