"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";
import type { TimetableEntry, TimetableSlot } from "./types";

export const slotToEntry = (s: TimetableSlot): TimetableEntry => ({
  id: s.id,
  dayOfWeek: s.dayOfWeek,
  startTime: s.startTime,
  endTime: s.endTime,
  room: s.room,
  title: s.section ? `${s.section.course.code} · ${s.section.course.name}` : "Class",
  subtitle: s.section ? `Section ${s.section.name}` : undefined,
});

export const useMyTimetable = () => useQuery({ queryKey: queryKeys.timetable.me, queryFn: async () => (await api.fetchMyTimetable()).map(slotToEntry) });
export const useMyTeachingTimetable = () => useQuery({ queryKey: [...queryKeys.timetable.all, "teaching"], queryFn: api.fetchMyTeachingTimetable });
export const useSectionTimetable = (sectionId: string) => useQuery({ queryKey: queryKeys.timetable.section(sectionId), queryFn: () => api.fetchSectionTimetable(sectionId), enabled: !!sectionId });

const TT = [queryKeys.timetable.all];
export const useCreateSlot = () => useAppMutation({ mutationFn: api.createSlot, successMessage: "Class slot added", invalidate: TT });
export const useUpdateSlot = () => useAppMutation({ mutationFn: api.updateSlot, successMessage: "Class slot updated", invalidate: TT });
export const useDeleteSlot = () => useAppMutation({ mutationFn: api.deleteSlot, successMessage: "Class slot removed", invalidate: TT });
