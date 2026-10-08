"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAttendanceTrend, fetchEnrollmentByProgram, fetchFeeTrend, fetchOverview } from "./api";

const STALE = 60_000; // dashboard numbers can be a minute old

export const useOverview = () => useQuery({ queryKey: queryKeys.analytics.overview, queryFn: fetchOverview, staleTime: STALE });

export const useFeeTrend = (months = 6) =>
  useQuery({ queryKey: queryKeys.analytics.feeTrend(months), queryFn: () => fetchFeeTrend(months), staleTime: STALE });

export const useAttendanceTrend = (months = 6) =>
  useQuery({ queryKey: queryKeys.analytics.attendanceTrend(months), queryFn: () => fetchAttendanceTrend(months), staleTime: STALE });

export const useEnrollmentByProgram = () =>
  useQuery({ queryKey: queryKeys.analytics.enrollment, queryFn: fetchEnrollmentByProgram, staleTime: STALE });
