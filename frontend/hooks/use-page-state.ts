"use client";

import { useCallback, useMemo, useState } from "react";
import type { PageParams } from "@/lib/pagination";

/**
 * Page / limit / search state for a paginated list.
 * Changing the limit or search jumps back to page 1.
 *
 *   const { params, setPage, setLimit, setSearch } = usePageState();
 *   useQuery({ queryKey: [..., params], queryFn: () => fetchPaginated(url, params), placeholderData: keepPreviousData });
 */
export function usePageState(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);
  const [search, setSearchState] = useState("");

  const setLimit = useCallback((next: number) => {
    setLimitState(next);
    setPage(1);
  }, []);

  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setPage(1);
  }, []);

  const params = useMemo<PageParams>(() => ({ page, limit, search: search || undefined }), [page, limit, search]);

  return { page, limit, search, params, setPage, setLimit, setSearch };
}
