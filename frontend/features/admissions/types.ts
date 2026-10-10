export type ApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "APPROVED" | "REJECTED" | "WAITLISTED" | "FEE_PENDING" | "ENROLLED";
export const APPLICATION_STATUSES: ApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "APPROVED", "WAITLISTED", "REJECTED", "FEE_PENDING", "ENROLLED"];
/** What a reviewer can set (matches the backend zod enum). */
export const REVIEW_STATUSES = ["SHORTLISTED", "APPROVED", "WAITLISTED", "REJECTED"] as const;

export interface Application {
  id: string;
  applicationNo: string;
  programId: string;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  email: string;
  phone: string | null;
  cnic: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth: string | null;
  address: string | null;
  status: ApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  remarks: string | null;
  studentProfileId: string | null;
  createdAt: string;
  program: { name: string; code: string };
}

export interface ApplicationDetail extends Omit<Application, "program"> {
  program: { name: string; code: string; department: { name: string } };
  documents: { id: string; media: { id: string; url: string; originalName?: string | null; fileName?: string | null } }[];
  statusHistory: { id: string; fromStatus: ApplicationStatus | null; toStatus: ApplicationStatus; note: string | null; createdAt: string }[];
  studentProfile: { registrationNo: string; user: { username: string; email: string } } | null;
}

export interface EnrollResult {
  user: { id: string; username: string; email: string; collegeEmail: string | null };
  student: { registrationNo: string };
  tempPassword: string;
  note: string;
}
