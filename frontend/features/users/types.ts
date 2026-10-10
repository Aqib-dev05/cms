import type { RoleName } from "@/types";

export interface RoleOption {
  id: string;
  name: RoleName;
  displayName: string;
  description: string | null;
}

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  collegeEmail: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { name: RoleName; displayName: string };
  staffProfile: { firstName: string; lastName: string; employeeId: string; designation: string | null; status: string; department: { name: string; code: string } | null } | null;
  studentProfile: { firstName: string; lastName: string; registrationNo: string; status: string; program: { name: string; code: string } } | null;
}

export const userDisplayName = (u: Pick<UserListItem, "username" | "staffProfile" | "studentProfile">) => {
  const p = u.staffProfile ?? u.studentProfile;
  return p ? `${p.firstName} ${p.lastName}`.trim() : u.username;
};
