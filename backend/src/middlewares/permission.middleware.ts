import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { getCachedUserPermissions, cacheUserPermissions } from "../config/redis";

async function resolveUserPermissions(userId: string): Promise<string[]> {
  const cached = await getCachedUserPermissions(userId);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
      userPermissions: { include: { permission: true } },
    },
  });

  if (!user) throw AppError.unauthorized("User not found");

  const permSet = new Set<string>(
    user.role.permissions.map((rp: { permission: { code: string } }) => rp.permission.code)
  );

  for (const up of user.userPermissions) {
    if (up.granted) permSet.add(up.permission.code);
    else permSet.delete(up.permission.code);
  }

  const permissions = Array.from(permSet);
  await cacheUserPermissions(userId, permissions);
  return permissions;
}

export function requirePermission(...requiredPerms: string[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();

    const userPerms = await resolveUserPermissions(req.user.userId);
    const hasAll = requiredPerms.every((p) => userPerms.includes(p));
    if (!hasAll) throw AppError.forbidden("You do not have permission to perform this action");

    next();
  });
}

export function requireAnyPermission(...requiredPerms: string[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();

    const userPerms = await resolveUserPermissions(req.user.userId);
    if (!requiredPerms.some((p) => userPerms.includes(p))) throw AppError.forbidden();

    next();
  });
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) { next(AppError.unauthorized()); return; }
    if (!roles.includes(req.user.roleName)) { next(AppError.forbidden()); return; }
    next();
  };
}
