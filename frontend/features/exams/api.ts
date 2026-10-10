import { getData, getDataOr, sendData } from "@/lib/api-helpers";
import type { BulkResultBody, Exam, ExamBody, ExamDetail, ExamSummary, GradeReport } from "./types";

export const fetchExams = (params: { sectionId?: string; semesterId?: string; type?: string }) => getDataOr<Exam[]>("/exams", [], params);
export const fetchExam = (id: string) => getData<ExamDetail>(`/exams/${id}`);
export const fetchExamSummary = (id: string) => getData<ExamSummary>(`/exams/${id}/summary`);
export const fetchMyGrades = (semesterId?: string) => getData<GradeReport>("/exams/me/grades", semesterId ? { semesterId } : undefined);

export const createExam = (b: ExamBody & { sectionId: string }) => sendData<Exam>("post", "/exams", b);
export const updateExam = ({ id, ...b }: Partial<ExamBody> & { id: string }) => sendData<Exam>("patch", `/exams/${id}`, b);
export const deleteExam = (id: string) => sendData("delete", `/exams/${id}`);
/** Publishes the exam AND every result (what students' grade reports read). */
export const publishResults = (id: string) => sendData("patch", `/exams/${id}/results/publish`);
export const saveResults = ({ id, ...b }: BulkResultBody & { id: string }) => sendData("post", `/exams/${id}/results/bulk`, b);
