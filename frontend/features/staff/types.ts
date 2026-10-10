import type { RoleName } from "@/types";
import type { SemesterType } from "@/features/academic/types";

export const STAFF_STATUSES = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "RETIRED"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export interface StaffProfileSummary {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  qualification: string | null;
  status: StaffStatus;
  joiningDate: string;
  phone: string | null;
  department: { name: string; code: string } | null;
}

/** Row of GET /staff — `id` is the *user* id; the profile has its own id. */
export interface StaffListItem {
  id: string;
  username: string;
  email: string;
  collegeEmail: string | null;
  isActive: boolean;
  role: { name: RoleName; displayName: string };
  staffProfile: StaffProfileSummary | null;
}

export interface StaffAssignment {
  sectionId: string;
  isPrimary: boolean;
  section: {
    id: string;
    name: string;
    course: { name: string; code: string };
    semester: { semesterNumber: number; type: SemesterType; isActive: boolean };
  };
}

export interface StaffDetail {
  id: string;
  username: string;
  email: string;
  collegeEmail: string | null;
  isActive: boolean;
  createdAt: string;
  role: { name: RoleName; displayName: string };
  staffProfile: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    fatherName: string | null;
    gender: "MALE" | "FEMALE" | "OTHER" | null;
    dateOfBirth: string | null;
    cnic: string | null;
    phone: string | null;
    address: string | null;
    designation: string | null;
    qualification: string | null;
    status: StaffStatus;
    joiningDate: string;
    leavingDate: string | null;
    department: { id: string; name: string; code: string } | null;
    courseTeachers: StaffAssignment[];
  };
}

export interface WorkloadSection {
  id: string;
  name: string;
  capacity: number;
  course: { name: string; code: string; creditHours: number };
  semester: { semesterNumber: number; type: SemesterType };
  _count: { enrollments: number; attendanceSessions: number };
}
export interface Workload {
  sections: WorkloadSection[];
  totalCreditHours: number;
  totalSections: number;
}

export const LEAVE_TYPES = ["SICK", "CASUAL", "ANNUAL", "MATERNITY", "PATERNITY", "UNPAID"] as const;
