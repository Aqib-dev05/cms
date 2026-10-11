import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { audit } from "../../utils/audit-logger";
import { invalidateUserPermissions } from "../../config/redis";
import { resolveUserPermissions } from "../../middlewares/permission.middleware";
import { createStaff } from "../users/users.service";
import { RoleName } from "../../types/prisma.types";
import type { Actor } from "../attendance/attendance.access";
import { CLERK_DUTIES, DUTY_META, isClerkDuty, permissionsForDuties, type ClerkDuty } from "./clerk.duties";

export interface CreateAssistantDto {
  username:      string;
  email:         string;
  password:      string;
  firstName:     string;
  lastName:      string;
  fatherName?:   string;
  phone?:        string;
  cnic?:         string;
  address?:      string;
  designation?:  string;
  qualification?: string;
  joiningDate?:  Date;
  duties:        string[];
}

export interface UpdateAssistantDto {
  firstName?:    string;
  lastName?:     string;
  phone?:        string;
  address?:      string;
  designation?:  string;
}

const ASSISTANT_SELECT = {
  id: true, username: true, email: true, collegeEmail: true,
  isActive: true, lastLoginAt: true, createdAt: true, duties: true, createdById: true,
  staffProfile: {
    select: {
      employeeId: true, firstName: true, lastName: true, phone: true,
      designation: true, cnic: true, joiningDate: true,
    },
  },
} as const;

export function getDutyCatalog() {
  return CLERK_DUTIES.map((key) => ({ key, label: DUTY_META[key].label, description: DUTY_META[key].description }));
}

/** Head clerk only sees/manages assistants he created. ADMIN sees every CLERK. */
async function loadScopedAssistant(actor: Actor, id: string) {
  const user = await prisma.user.findFirst({
    where: {
      id,
      role: { name: "CLERK" },
      ...(actor.roleName !== "ADMIN" && { createdById: actor.userId }),
    },
    select: ASSISTANT_SELECT,
  });
  if (!user) throw AppError.notFound("Assistant not found");
  return user;
}

function normaliseDuties(raw: string[]): ClerkDuty[] {
  const unique = [...new Set(raw)];
  const bad = unique.filter((d) => !isClerkDuty(d));
  if (bad.length) throw AppError.badRequest(`Unknown duty: ${bad.join(", ")}`);
  return unique as ClerkDuty[];
}

/** An actor may only delegate permissions he holds himself. */
async function assertCanDelegate(actor: Actor, duties: ClerkDuty[]) {
  if (actor.roleName === "ADMIN") return;
  const mine = new Set(await resolveUserPermissions(actor.userId));
  for (const duty of duties) {
    const missing = DUTY_META[duty].permissions.filter((p) => !mine.has(p));
    if (missing.length) {
      throw AppError.forbidden(`You can't hand over "${DUTY_META[duty].label}" — you don't hold that access yourself`);
    }
  }
}

async function applyDuties(userId: string, duties: ClerkDuty[]) {
  const codes = permissionsForDuties(duties);
  const perms = await prisma.permission.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  if (perms.length !== codes.length) {
    const found = new Set(perms.map((p: { code: string }) => p.code));
    throw AppError.internal(`Permissions missing in DB (run db:seed): ${codes.filter((c) => !found.has(c)).join(", ")}`);
  }

  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId } }),
    prisma.userPermission.createMany({
      data: perms.map((p: { id: string }) => ({ userId, permissionId: p.id, granted: true })),
    }),
    prisma.user.update({ where: { id: userId }, data: { duties } }),
  ]);
  await invalidateUserPermissions(userId);
}

export async function listAssistants(actor: Actor, params: {
  page: number; limit: number; isActive?: boolean; search?: string;
}) {
  const { page, limit, isActive, search } = params;
  const where = {
    role: { name: "CLERK" as const },
    ...(actor.roleName !== "ADMIN" && { createdById: actor.userId }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { username: { contains: search, mode: "insensitive" as const } },
        { staffProfile: { firstName: { contains: search, mode: "insensitive" as const } } },
        { staffProfile: { lastName:  { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };
  const [assistants, total] = await Promise.all([
    prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, select: ASSISTANT_SELECT }),
    prisma.user.count({ where }),
  ]);
  return { assistants, total };
}

export async function getAssistant(actor: Actor, id: string) {
  return loadScopedAssistant(actor, id);
}

export async function createAssistant(actor: Actor, dto: CreateAssistantDto) {
  const duties = normaliseDuties(dto.duties);
  await assertCanDelegate(actor, duties);

  const created = await createStaff({
    username: dto.username, email: dto.email, password: dto.password,
    roleName: RoleName.CLERK,
    firstName: dto.firstName, lastName: dto.lastName, fatherName: dto.fatherName,
    phone: dto.phone, cnic: dto.cnic, address: dto.address,
    designation: dto.designation ?? "Assistant Clerk",
    qualification: dto.qualification,
    joiningDate: dto.joiningDate ?? new Date(),
  });

  await prisma.user.update({ where: { id: created.id }, data: { createdById: actor.userId } });
  await applyDuties(created.id, duties);

  await audit({
    userId: actor.userId, action: "ASSISTANT_CREATE", module: "clerk", entityId: created.id,
    newData: { username: dto.username, duties },
  });
  return loadScopedAssistant(actor, created.id);
}

export async function updateAssistant(actor: Actor, id: string, dto: UpdateAssistantDto) {
  await loadScopedAssistant(actor, id);
  await prisma.staffProfile.update({ where: { userId: id }, data: dto });
  return loadScopedAssistant(actor, id);
}

export async function setAssistantDuties(actor: Actor, id: string, rawDuties: string[]) {
  const before = await loadScopedAssistant(actor, id);
  const duties = normaliseDuties(rawDuties);
  await assertCanDelegate(actor, duties);
  await applyDuties(id, duties);

  await audit({
    userId: actor.userId, action: "ASSISTANT_DUTIES", module: "clerk", entityId: id,
    oldData: { duties: before.duties }, newData: { duties },
  });
  return loadScopedAssistant(actor, id);
}

export async function setAssistantActive(actor: Actor, id: string, isActive: boolean) {
  await loadScopedAssistant(actor, id);
  await prisma.user.update({ where: { id }, data: { isActive } });
  if (!isActive) await prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } });
  await invalidateUserPermissions(id);

  await audit({
    userId: actor.userId, action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE", module: "clerk", entityId: id,
  });
  return loadScopedAssistant(actor, id);
}

export async function resetAssistantPassword(actor: Actor, id: string, password: string) {
  await loadScopedAssistant(actor, id);
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash: hash } });
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } });
  await invalidateUserPermissions(id);

  await audit({ userId: actor.userId, action: "PASSWORD_RESET", module: "clerk", entityId: id });
}
