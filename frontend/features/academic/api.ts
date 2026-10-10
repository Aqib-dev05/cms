import { getDataOr, getData, sendData } from "@/lib/api-helpers";
import type { AcademicSession, Course, Department, Program, Section, SectionDetail, Semester } from "./types";

export interface CourseParams {
  departmentId?: string;
  semesterId?: string;
  search?: string;
  includeInactive?: boolean;
}
export interface SectionParams {
  semesterId?: string;
  courseId?: string;
  teacherId?: string;
}

// ── reads
export const fetchDepartments = (includeInactive = true) => getDataOr<Department[]>("/academic/departments", [], { includeInactive });
export const fetchPrograms = (includeInactive = false) => getDataOr<Program[]>("/academic/programs", [], includeInactive ? { includeInactive: true } : undefined);
export const fetchSessions = (programId: string) => getDataOr<AcademicSession[]>(`/academic/programs/${programId}/sessions`, []);
export const fetchSemesters = (sessionId: string) => getDataOr<Semester[]>(`/academic/sessions/${sessionId}/semesters`, []);
export const fetchCourses = (params: CourseParams) => getDataOr<Course[]>("/academic/courses", [], params);
export const fetchSections = (params: SectionParams) => getDataOr<Section[]>("/academic/sections", [], params);
export const fetchSection = (id: string) => getData<SectionDetail>(`/academic/sections/${id}`);

// ── writes (bodies mirror the backend zod schemas)
export const createDepartment = (b: { name: string; code: string; description?: string }) => sendData<Department>("post", "/academic/departments", b);
export const updateDepartment = ({ id, ...b }: { id: string; name?: string; code?: string; description?: string; isActive?: boolean }) => sendData<Department>("patch", `/academic/departments/${id}`, b);
export const assignHod = ({ id, hodId }: { id: string; hodId: string }) => sendData("patch", `/academic/departments/${id}/hod`, { hodId });

export interface ProgramBody { name: string; code: string; description?: string; durationYears?: number; totalSemesters?: number }
export const createProgram = (b: ProgramBody & { departmentId: string }) => sendData<Program>("post", "/academic/programs", b);
export const updateProgram = ({ id, ...b }: Partial<ProgramBody> & { id: string; isActive?: boolean }) => sendData<Program>("patch", `/academic/programs/${id}`, b);

export const createSession = (b: { name: string; programId: string; startDate: string; endDate: string }) => sendData<AcademicSession>("post", "/academic/sessions", b);
export const updateSession = ({ id, ...b }: { id: string; name?: string; startDate?: string; endDate?: string; isActive?: boolean }) => sendData<AcademicSession>("patch", `/academic/sessions/${id}`, b);

export const createSemester = (b: { semesterNumber: number; type: string; academicSessionId: string; startDate: string; endDate: string }) => sendData<Semester>("post", "/academic/semesters", b);
export const updateSemester = ({ id, ...b }: { id: string; semesterNumber?: number; type?: string; startDate?: string; endDate?: string; isActive?: boolean }) => sendData<Semester>("patch", `/academic/semesters/${id}`, b);

export interface CourseBody { name: string; code: string; creditHours?: number; description?: string; isElective?: boolean }
export const createCourse = (b: CourseBody & { departmentId: string }) => sendData<Course>("post", "/academic/courses", b);
export const updateCourse = ({ id, ...b }: Partial<CourseBody> & { id: string; isActive?: boolean }) => sendData<Course>("patch", `/academic/courses/${id}`, b);
export const assignCourseToSemester = ({ courseId, semesterId }: { courseId: string; semesterId: string }) => sendData("post", `/academic/courses/${courseId}/semesters`, { semesterId });

export const createSection = (b: { name: string; courseId: string; semesterId: string; capacity?: number }) => sendData<Section>("post", "/academic/sections", b);
export const updateSection = ({ id, ...b }: { id: string; name?: string; capacity?: number }) => sendData<Section>("patch", `/academic/sections/${id}`, b);
export const assignTeacher = ({ sectionId, staffProfileId, isPrimary }: { sectionId: string; staffProfileId: string; isPrimary?: boolean }) =>
  sendData("post", `/academic/sections/${sectionId}/teachers`, { staffProfileId, isPrimary });
export const removeTeacher = ({ sectionId, staffProfileId }: { sectionId: string; staffProfileId: string }) => sendData("delete", `/academic/sections/${sectionId}/teachers/${staffProfileId}`);
