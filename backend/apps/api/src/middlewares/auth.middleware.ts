import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
}

// Extend Express Request with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies access token and attaches user to request.
 * Does NOT check permissions — that's requirePermission()'s job.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Access token required");
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      req.user = payload;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized("Access token expired");
      }
      throw AppError.unauthorized("Invalid access token");
    }
  }
);

/**
 * Optional auth — attaches user if token present, continues either way.
 * Useful for public routes that show extra info when authenticated.
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
  } catch {
    // ignore invalid token — treat as unauthenticated
  }
  next();
};
