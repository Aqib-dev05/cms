import { getDataOr, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse, RoleName } from "@/types";
import type { RoleOption, UserListItem } from "./types";

export interface UserListParams extends PageParams {
  role?: RoleName;
  isActive?: "true" | "false";
}

export const fetchUsers = (params: UserListParams): Promise<PaginatedResponse<UserListItem>> => fetchPaginated<UserListItem, UserListParams>("/users", params);
export const fetchRoles = () => getDataOr<RoleOption[]>("/users/roles", []);

export interface CreateStaffBody {
  username: string;
  email: string;
  password: string;
  roleName: RoleName;
  firstName: string;
  lastName: string;
  fatherName?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  designation?: string;
  qualification?: string;
  joiningDate: string;
  departmentId?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
}
export const createStaff = (b: CreateStaffBody) => sendData<{ id: string; username: string }>("post", "/users/staff", b);
export const toggleUserStatus = (id: string) => sendData<{ id: string; isActive: boolean; username: string }>("patch", `/users/${id}/toggle-status`);
export const resetUserPassword = ({ id, newPassword }: { id: string; newPassword: string }) => sendData("patch", `/users/${id}/reset-password`, { newPassword });
export const updateStaffProfile = ({ id, ...b }: { id: string; firstName?: string; lastName?: string; phone?: string; address?: string; designation?: string; qualification?: string; departmentId?: string | null }) =>
  sendData("patch", `/users/${id}/profile`, b);
