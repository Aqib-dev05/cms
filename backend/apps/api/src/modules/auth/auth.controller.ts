import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as authService from "./auth.service";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const dto = loginSchema.parse(req.body);
  const ipAddress = req.ip;
  const deviceInfo = req.headers["user-agent"];

  const result = await authService.login(dto, ipAddress, deviceInfo);

  // Set refresh token as httpOnly cookie
  res.cookie("refreshToken", result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  ApiRes.success(res, {
    accessToken: result.tokens.accessToken,
    user: result.user,
  }, "Login successful");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) throw AppError.unauthorized("Refresh token not found");

  const tokens = await authService.refreshTokens(refreshToken, req.ip);

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  ApiRes.success(res, { accessToken: tokens.accessToken }, "Token refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.clearCookie("refreshToken");
  ApiRes.success(res, null, "Logged out successfully");
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  await authService.logoutAll(req.user.userId);
  res.clearCookie("refreshToken");
  ApiRes.success(res, null, "Logged out from all devices");
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await authService.getMe(req.user.userId);
  ApiRes.success(res, user);
});

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const dto = changePasswordSchema.parse(req.body);

    await authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword
    );

    res.clearCookie("refreshToken");
    ApiRes.success(res, null, "Password changed. Please log in again.");
  }
);
