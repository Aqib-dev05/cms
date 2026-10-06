export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface AssignHodDto {
  hodId: string; // user id of the HOD
}

export interface CreateProgramDto {
  name: string;
  code: string;
  departmentId: string;
  description?: string;
  durationYears?: number;
  totalSemesters?: number;
}

export interface UpdateProgramDto {
  name?: string;
  code?: string;
  description?: string;
  durationYears?: number;
  totalSemesters?: number;
  isActive?: boolean;
}

export interface CreateSessionDto {
  name: string;         // e.g. "2024-2025"
  programId: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateSessionDto {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface CreateSemesterDto {
  semesterNumber: number;
  type: "FALL" | "SPRING" | "SUMMER";
  academicSessionId: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateSemesterDto {
  semesterNumber?: number;
  type?: "FALL" | "SPRING" | "SUMMER";
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface CreateCourseDto {
  name: string;
  code: string;
  departmentId: string;
  creditHours?: number;
  description?: string;
  isElective?: boolean;
}

export interface UpdateCourseDto {
  name?: string;
  code?: string;
  creditHours?: number;
  description?: string;
  isElective?: boolean;
  isActive?: boolean;
}

export interface AssignCourseToSemesterDto {
  courseId: string;
  semesterId: string;
}

export interface CreateSectionDto {
  name: string;       // "A", "B", "CS-A"
  courseId: string;
  semesterId: string;
  capacity?: number;
}

export interface UpdateSectionDto {
  name?: string;
  capacity?: number;
}

export interface AssignTeacherDto {
  staffProfileId: string;
  isPrimary?: boolean;
}
