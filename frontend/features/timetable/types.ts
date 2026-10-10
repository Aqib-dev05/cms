export interface TimetableSlot {
  id: string;
  sectionId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  section?: { id: string; name: string; course: { name: string; code: string } };
}

/** What <WeeklyTimetable> renders — built from slots of any source. */
export interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  title: string;
  subtitle?: string;
}
