import { getData, getDataOr, sendData } from "@/lib/api-helpers";
import type { AttendanceSessionDetail, AttendanceSessionListItem, AttendanceStatus, MarkBody, MyAttendance, SectionSummary } from "./types";

export const fetchMyAttendance = () => getData<MyAttendance>("/attendance/me");
export const fetchSectionSessions = (sectionId: string) => getDataOr<AttendanceSessionListItem[]>(`/attendance/sections/${sectionId}/sessions`, []);
export const fetchSectionSummary = (sectionId: string) => getData<SectionSummary>(`/attendance/sections/${sectionId}/summary`);
export const fetchSession = (id: string) => getData<AttendanceSessionDetail>(`/attendance/sessions/${id}`);
export const markAttendance = (b: MarkBody) => sendData("post", "/attendance", b);
export const updateRecord = ({ recordId, status, remarks }: { recordId: string; status: AttendanceStatus; remarks?: string }) =>
  sendData("patch", `/attendance/records/${recordId}`, { status, ...(remarks ? { remarks } : {}) });
