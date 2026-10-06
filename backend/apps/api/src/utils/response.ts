import { Response } from "express";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ApiRes {
  static success<T>(
    res: Response,
    data: T,
    message: string = "Success",
    statusCode: number = 200
  ): Response {
    const body: ApiResponse<T> = { success: true, message, data };
    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, data: T, message: string = "Created"): Response {
    return ApiRes.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message: string = "Success"
  ): Response {
    const body: ApiResponse<T[]> = { success: true, message, data, meta };
    return res.status(200).json(body);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}

// ── Pagination helper ─────────────────────────────────────────

export function getPaginationParams(
  query: Record<string, string | undefined>
): { skip: number; take: number; page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20", 10)));
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
