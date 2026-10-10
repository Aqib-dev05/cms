export type ExamType = "MIDTERM" | "FINAL" | "QUIZ" | "ASSIGNMENT" | "LAB" | "PROJECT" | "SESSIONAL";

interface SectionRef {
  id: string;
  name: string;
  course: { name: string; code: string };
  semester: { semesterNumber: number; type: string };
}

export interface Exam {
  id: string;
  title: string;
  type: ExamType;
  sectionId: string;
  totalMarks: number;
  passingMarks: number;
  date: string | null;
  duration: number | null;
  instructions: string | null;
  isPublished: boolean;
  section: SectionRef;
  _count: { results: number };
}

export interface ExamResultRow {
  id: string;
  studentProfileId: string;
  marksObtained: number;
  isAbsent: boolean;
  remarks: string | null;
  isPublished: boolean;
  studentProfile: { registrationNo: string; firstName: string; lastName: string };
}

export interface ExamDetail extends Omit<Exam, "_count"> {
  results: ExamResultRow[];
}

export interface ExamStats {
  total: number;
  absent: number;
  passing: number;
  failing: number;
  passRate: number;
  highest: number;
  lowest: number;
  average: number;
}
export interface ExamSummary {
  exam: { id: string; title: string; totalMarks: number; passingMarks: number };
  stats: ExamStats | null;
}

export interface GradeCourse {
  course: { name: string; code: string; creditHours: number };
  exams: { id: string; marksObtained: number; isAbsent: boolean; remarks: string | null; exam: { id: string; title: string; type: ExamType; totalMarks: number; passingMarks: number; date: string | null } }[];
  percentage: number;
  grade: string;
  isPassing: boolean;
}
export interface GradeReport {
  courses: GradeCourse[];
  overallPercentage: number;
  overallGrade: string;
}

export interface ExamBody {
  title: string;
  type: ExamType;
  totalMarks: number;
  passingMarks: number;
  date?: string;
  duration?: number;
  instructions?: string;
}
export interface BulkResultBody {
  results: { studentProfileId: string; marksObtained: number; isAbsent?: boolean; remarks?: string }[];
}
