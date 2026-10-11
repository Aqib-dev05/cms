export interface DutyInfo {
  key: string;
  label: string;
  description: string;
}

export interface Assistant {
  id: string;
  username: string;
  email: string;
  collegeEmail: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  duties: string[];
  createdById: string | null;
  staffProfile: {
    employeeId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    designation: string | null;
    cnic: string | null;
    joiningDate: string;
  } | null;
}
