import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { invalidateUserPermissions } from "../../config/redis";
import { generateEmployeeId, generateCollegeEmail } from "../../utils/reg-no";
import { env } from "../../config/env";
import { RoleName } from "../../types/prisma.types";

export interface CreateStaffDto {
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
  joiningDate: Date;
  departmentId?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: Date;
}

export interface UpdateStaffProfileDto {
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  phone?: string;
  address?: string;
  designation?: string;
  qualification?: string;
  departmentId?: string | null;
}

const USER_SELECT = {
  id: true, username: true, email: true,
  collegeEmail: true, isActive: true,
  lastLoginAt: true, createdAt: true,
  role: { select: { name: true, displayName: true } },
  staffProfile: {
    select: {
      firstName: true, lastName: true,
      employeeId: true, designation: true, status: true,
      department: { select: { name: true, code: true } },
    },
  },
  studentProfile: {
    select: {
      firstName: true, lastName: true,
      registrationNo: true, status: true,
      program: { select: { name: true, code: true } },
    },
  },
} as const;

export async function getAllUsers(params: {
  page: number; limit: number;
  role?: RoleName; isActive?: boolean; search?: string;
}) {
  const { page, limit, role, isActive, search } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(role && { role: { name: role } }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { username: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { staffProfile: { OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
        ]}},
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, select: USER_SELECT }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_SELECT,
      updatedAt: true,
      staffProfile: {
        include: { department: { select: { name: true, code: true } } },
      },
      studentProfile: {
        include: { program: { select: { name: true, code: true } } },
      },
    },
  });
  if (!user) throw AppError.notFound("User not found");
  return user;
}

export async function createStaff(dto: CreateStaffDto) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: dto.username }, { email: dto.email }] },
  });
  if (existing) {
    throw AppError.conflict(
      existing.username === dto.username ? "Username already taken" : "Email already in use"
    );
  }

  const role = await prisma.role.findUnique({ where: { name: dto.roleName } });
  if (!role) throw AppError.notFound("Role not found");

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const employeeId = await generateEmployeeId();

  const collegeEmail = env.COLLEGE_EMAIL_ENABLED
    ? generateCollegeEmail(dto.firstName, dto.lastName, env.COLLEGE_EMAIL_DOMAIN)
    : undefined;

  return prisma.user.create({
    data: {
      username: dto.username,
      email: dto.email,
      collegeEmail,
      passwordHash,
      roleId: role.id,
      staffProfile: {
        create: {
          employeeId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          fatherName: dto.fatherName,
          phone: dto.phone,
          cnic: dto.cnic,
          address: dto.address,
          designation: dto.designation,
          qualification: dto.qualification,
          joiningDate: dto.joiningDate,
          departmentId: dto.departmentId,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth,
        },
      },
    },
    select: {
      id: true, username: true, email: true,
      role: { select: { name: true, displayName: true } },
      staffProfile: { select: { employeeId: true, firstName: true, lastName: true } },
    },
  });
}

export async function updateStaffProfile(id: string, dto: UpdateStaffProfileDto) {
  const profile = await prisma.staffProfile.findUnique({ where: { userId: id } });
  if (!profile) throw AppError.notFound("Staff profile not found");
  return prisma.staffProfile.update({ where: { userId: id }, data: dto });
}

export async function toggleUserStatus(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound("User not found");

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, isActive: true, username: true },
  });
  await invalidateUserPermissions(id);
  return updated;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound("User not found");

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash: hash } });
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } });
  await invalidateUserPermissions(id);
}

export async function getRoles() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, displayName: true, description: true },
  });
}
