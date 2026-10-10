import { getDataOr, sendData } from "@/lib/api-helpers";
import { fetchWorkload } from "@/features/staff/api";
import type { TimetableEntry, TimetableSlot } from "./types";

export const fetchMyTimetable = () => getDataOr<TimetableSlot[]>("/timetable/me", []);
export const fetchSectionTimetable = (sectionId: string) => getDataOr<TimetableSlot[]>(`/timetable/sections/${sectionId}`, []);

/** Teacher's week = the slots of every section they teach (works without knowing the staff-profile id). */
export async function fetchMyTeachingTimetable(): Promise<TimetableEntry[]> {
  const workload = await fetchWorkload("me");
  const active = workload.sections.filter((s) => s.semester);
  const perSection = await Promise.all(active.map(async (s) => ({ s, slots: await fetchSectionTimetable(s.id) })));
  return perSection.flatMap(({ s, slots }) =>
    slots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      title: `${s.course.code} · ${s.course.name}`,
      subtitle: `Section ${s.name}`,
    }))
  );
}

export interface SlotBody {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
}
export const createSlot = (b: SlotBody & { sectionId: string }) => sendData<TimetableSlot>("post", "/timetable", b);
export const updateSlot = ({ id, ...b }: Partial<SlotBody> & { id: string }) => sendData<TimetableSlot>("patch", `/timetable/${id}`, b);
export const deleteSlot = (id: string) => sendData("delete", `/timetable/${id}`);
