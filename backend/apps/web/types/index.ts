export type RoleName =
  | "ADMIN" | "HOD" | "TEACHER" | "HEAD_CLERK"
  | "CLERK" | "COMPLAINT_OFFICER" | "LIBRARIAN" | "STUDENT";

export interface AuthUser {
  id:           string;
  username:     string;
  email:        string;
  collegeEmail: string | null;
  role:         { name: RoleName; displayName: string };
  isActive:     boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?:   T;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  message: string;
  data:    T[];
  meta:    { total: number; page: number; limit: number; totalPages: number };
}
