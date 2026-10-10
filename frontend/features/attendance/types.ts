export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export const AT_RISK_THRESHOLD = 75;

export interface PersonRef {
  registrationNo: string;
  firstName: string;
  lastName: string;
}

export interface AttendanceSessionListItem {
  id: string;
  sectionId: string;
  date: string;
  topic: string | null;
  _count: { records: number };
}

export interface AttendanceRecordRow {
  id: string;
  status: AttendanceStatus;
  remarks: string | null;
  studentProfileId: string;
  studentProfile: PersonRef;
}

export interface AttendanceSessionDetail {
  id: string;
  date: string;
  topic: string | null;
  section: { id: string; name: string; course: { name: string; code: string } };
  records: AttendanceRecordRow[];
}

export interface SectionSummaryRow {
  student: PersonRef & { id: string };
  present: number;
  absent: number;
  late: number;
  totalSessions: number;
  percentage: number;
  isAtRisk: boolean;
}
export interface SectionSummary {
  totalSessions: number;
  students: SectionSummaryRow[];
}

export interface MyAttendanceRecord {
  id: string;
  status: AttendanceStatus;
  remarks: string | null;
  attendanceSession: { id: string; date: string; topic: string | null; section: { id: string; name: string; course: { name: string; code: string } } };
}
export interface MyAttendance {
  summary: { total: number; present: number; absent: number; late: number; excused: number; percentage: number };
  records: MyAttendanceRecord[];
}

export interface MarkBody {
  sectionId: string;
  date: string;
  topic?: string;
  records: { studentProfileId: string; status: AttendanceStatus; remarks?: string }[];
}
