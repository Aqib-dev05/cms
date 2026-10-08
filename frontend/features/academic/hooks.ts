"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchPrograms } from "./api";

/** Programs rarely change — cache them for 5 minutes. */
export const usePrograms = () => useQuery({ queryKey: queryKeys.academic.programs, queryFn: fetchPrograms, staleTime: 5 * 60_000 });
