export const STUDENT_STATUSES = ["ACTIVE", "GRADUATED", "SUSPENDED", "EXPELLED", "ON_LEAVE", "DROPPED_OUT", "ALUMNI"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

/** Statuses an admin may set (ALUMNI isn't accepted by PATCH /students/:id/status). */
export const SETTABLE_STATUSES = ["ACTIVE", "SUSPENDED", "EXPELLED", "ON_LEAVE", "DROPPED_OUT", "GRADUATED"] as const;
export type SettableStatus = (typeof SETTABLE_STATUSES)[number];

export interface StudentProfile {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: string | null;
  cnic: string | null;
  phone: string | null;
  personalEmail: string | null;
  address: string | null;
  status: StudentStatus;
  enrollmentDate: string;
  graduationDate: string | null;
  currentSemester: number | null;
  programId: string;
  program: { name: string; code: string; department: { name: string; code?: string } };
}

/** Row of GET /students — note `id` is the *user* id, and all /students/:id routes use it. */
export interface StudentListItem {
  id: string;
  username: string;
  email: string;
  collegeEmail: string | null;
  isActive: boolean;
  createdAt: string;
  studentProfile: StudentProfile;
}

export interface StudentEnrollment {
  id: string;
  isActive: boolean;
  section: {
    id: string;
    name: string;
    course: { name: string; code: string; creditHours: number };
    semester: { semesterNumber: number; type: string };
    teachers: { staffProfile: { firstName: string; lastName: string } }[];
  };
}

/** GET /students/:id */
export interface StudentDetail extends Omit<StudentListItem, "studentProfile"> {
  studentProfile: StudentProfile & { enrollments: StudentEnrollment[] };
}

export interface CreatedStudent {
  id: string;
  username: string;
  email: string;
  collegeEmail: string | null;
  studentProfile: { registrationNo: string; firstName: string; lastName: string; program: { name: string; code: string } };
}

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();
