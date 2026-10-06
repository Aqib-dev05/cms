import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err && typeof err === "object" && "code" in err) {
    const e = err as { code: string; meta?: { target?: string[] } };
    if (e.code === "P2002") {
      const field = e.meta?.target?.[0] ?? "field";
      res.status(409).json({ success: false, message: `${field} already exists` });
      return;
    }
    if (e.code === "P2025") {
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }
  }

  logger.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(env.NODE_ENV === "development" && {
      stack: err instanceof Error ? err.stack : String(err),
    }),
  });
}
