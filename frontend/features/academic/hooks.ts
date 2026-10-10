"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppMutation } from "@/hooks/use-app-mutation";
import * as api from "./api";

const FIVE_MIN = 5 * 60_000;

/** Programs rarely change — cache them for 5 minutes. */
export const usePrograms = () => useQuery({ queryKey: queryKeys.academic.programs, queryFn: () => api.fetchPrograms(), staleTime: FIVE_MIN });
/** Every program, including inactive ones (admin tables). */
export const useAllPrograms = () => useQuery({ queryKey: [...queryKeys.academic.programs, "all"], queryFn: () => api.fetchPrograms(true) });
export const useDepartments = () => useQuery({ queryKey: queryKeys.academic.departments, queryFn: () => api.fetchDepartments(), staleTime: FIVE_MIN });
export const useSessions = (programId: string) => useQuery({ queryKey: queryKeys.academic.sessions(programId), queryFn: () => api.fetchSessions(programId), enabled: !!programId });
export const useSemesters = (sessionId: string) => useQuery({ queryKey: queryKeys.academic.semesters(sessionId), queryFn: () => api.fetchSemesters(sessionId), enabled: !!sessionId });
export const useCourses = (params: api.CourseParams = {}) => useQuery({ queryKey: queryKeys.academic.courses(params), queryFn: () => api.fetchCourses(params), staleTime: 60_000 });
export const useSections = (params: api.SectionParams = {}, enabled = true) =>
  useQuery({ queryKey: queryKeys.academic.sections(params), queryFn: () => api.fetchSections(params), enabled, staleTime: 60_000 });
export const useSection = (id: string) => useQuery({ queryKey: queryKeys.academic.section(id), queryFn: () => api.fetchSection(id), enabled: !!id });

const ACADEMIC = [queryKeys.academic.all];

export const useCreateDepartment = () => useAppMutation({ mutationFn: api.createDepartment, successMessage: "Department created", invalidate: ACADEMIC });
export const useUpdateDepartment = () => useAppMutation({ mutationFn: api.updateDepartment, successMessage: "Department updated", invalidate: ACADEMIC });
export const useAssignHod = () => useAppMutation({ mutationFn: api.assignHod, successMessage: "HOD assigned", invalidate: [queryKeys.academic.all, queryKeys.staff.all] });

export const useCreateProgram = () => useAppMutation({ mutationFn: api.createProgram, successMessage: "Program created", invalidate: ACADEMIC });
export const useUpdateProgram = () => useAppMutation({ mutationFn: api.updateProgram, successMessage: "Program updated", invalidate: ACADEMIC });

export const useCreateSession = () => useAppMutation({ mutationFn: api.createSession, successMessage: "Session created", invalidate: ACADEMIC });
export const useUpdateSession = () => useAppMutation({ mutationFn: api.updateSession, successMessage: "Session updated", invalidate: ACADEMIC });
export const useCreateSemester = () => useAppMutation({ mutationFn: api.createSemester, successMessage: "Semester created", invalidate: ACADEMIC });
export const useUpdateSemester = () => useAppMutation({ mutationFn: api.updateSemester, successMessage: "Semester updated", invalidate: ACADEMIC });

export const useCreateCourse = () => useAppMutation({ mutationFn: api.createCourse, successMessage: "Course created", invalidate: ACADEMIC });
export const useUpdateCourse = () => useAppMutation({ mutationFn: api.updateCourse, successMessage: "Course updated", invalidate: ACADEMIC });
export const useAssignCourseToSemester = () => useAppMutation({ mutationFn: api.assignCourseToSemester, successMessage: "Course added to semester", invalidate: ACADEMIC });

export const useCreateSection = () => useAppMutation({ mutationFn: api.createSection, successMessage: "Section created", invalidate: ACADEMIC });
export const useUpdateSection = () => useAppMutation({ mutationFn: api.updateSection, successMessage: "Section updated", invalidate: ACADEMIC });
export const useAssignTeacher = () => useAppMutation({ mutationFn: api.assignTeacher, successMessage: "Teacher assigned", invalidate: [queryKeys.academic.all, queryKeys.staff.all, queryKeys.timetable.all] });
export const useRemoveTeacher = () => useAppMutation({ mutationFn: api.removeTeacher, successMessage: "Teacher removed", invalidate: [queryKeys.academic.all, queryKeys.staff.all, queryKeys.timetable.all] });
