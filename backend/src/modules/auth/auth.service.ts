import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/database";
import { redis } from "../../config/redis";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { logger } from "../../utils/logger";
import type { LoginDto, TokenPayload, AuthTokens, AuthUser } from "./auth.types";

function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

function getRefreshTokenExpiry(): Date {
  const days = parseInt(env.JWT_REFRESH_EXPIRES.replace("d", ""), 10);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function login(
  dto: LoginDto,
  ipAddress?: string,
  deviceInfo?: string
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: dto.username }, { email: dto.username }] },
    include: { role: true },
  });

  if (!user) throw AppError.unauthorized("Invalid credentials");
  if (!user.isActive) throw AppError.unauthorized("Account is deactivated. Contact admin.");

  const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isPasswordValid) throw AppError.unauthorized("Invalid credentials");

  const tokenPayload: TokenPayload = {
    userId: user.id,
    roleId: user.roleId,
    roleName: user.role.name,
  };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      deviceInfo,
      ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info(`Login: ${user.username} (${user.role.name})`);

  return {
    tokens: { accessToken, refreshToken },
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      collegeEmail: user.collegeEmail,
      role: { name: user.role.name, displayName: user.role.displayName },
      isActive: user.isActive,
    },
  };
}

export async function refreshTokens(oldToken: string, ipAddress?: string): Promise<AuthTokens> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(oldToken, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!stored || stored.isRevoked) throw AppError.unauthorized("Refresh token revoked");
  if (stored.expiresAt < new Date()) throw AppError.unauthorized("Refresh token expired");

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  });
  if (!user || !user.isActive) throw AppError.unauthorized();

  const newPayload: TokenPayload = { userId: user.id, roleId: user.roleId, roleName: user.role.name };
  const newAccess = signAccessToken(newPayload);
  const newRefresh = signRefreshToken(newPayload);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: newRefresh, ipAddress, expiresAt: getRefreshTokenExpiry() },
  });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { isRevoked: true },
  });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
  await redis.del(`perms:${userId}`);
}

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) throw AppError.notFound("User not found");

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    collegeEmail: user.collegeEmail,
    role: { name: user.role.name, displayName: user.role.displayName },
    isActive: user.isActive,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound();

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw AppError.badRequest("Current password is incorrect");

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  await logoutAll(userId);
}
