import { Request, Response, NextFunction } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps async route handlers to catch errors and pass to next()
 * Eliminates try/catch boilerplate in every controller
 */
export const asyncHandler = (fn: AsyncFn) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
