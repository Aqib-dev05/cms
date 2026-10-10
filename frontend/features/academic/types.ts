export type SemesterType = "FALL" | "SPRING" | "SUMMER";

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  headId: string | null;
  _count?: { programs: number; staffProfiles: number };
}

export interface Program {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  departmentId?: string;
  description?: string | null;
  durationYears?: number;
  totalSemesters?: number;
  department: { name: string; code: string };
  _count?: { studentProfiles: number; academicSessions: number };
}

export interface AcademicSession {
  id: string;
  name: string;
  programId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  _count?: { semesters: number };
}

export interface Semester {
  id: string;
  semesterNumber: number;
  type: SemesterType;
  academicSessionId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  _count?: { sections: number };
}

export interface Course {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  creditHours: number;
  description: string | null;
  isElective: boolean;
  isActive: boolean;
  department: { name: string; code: string };
  _count?: { sections: number };
}

export interface SectionTeacher {
  staffProfileId: string;
  isPrimary: boolean;
  staffProfile: { firstName: string; lastName: string; designation: string | null; user?: { id: string } };
}

export interface Section {
  id: string;
  name: string;
  capacity: number;
  courseId: string;
  semesterId: string;
  course: { name: string; code: string; creditHours: number };
  semester: { semesterNumber: number; type: SemesterType; isActive: boolean };
  teachers: SectionTeacher[];
  _count?: { enrollments: number };
}

export interface SectionDetail extends Omit<Section, "semester"> {
  semester: { semesterNumber: number; type: SemesterType; isActive: boolean; academicSession?: { name: string; program: { name: string } } };
  timetableSlots: { id: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null }[];
  _count?: { enrollments: number; attendanceSessions: number };
}

export const sectionLabel = (s: Pick<Section, "name" | "course" | "semester">) =>
  `${s.course.code} · ${s.name} — Sem ${s.semester.semesterNumber} ${s.semester.type.charAt(0)}${s.semester.type.slice(1).toLowerCase()}`;

export const personName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();
