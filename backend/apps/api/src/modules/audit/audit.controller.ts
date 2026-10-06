import { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import * as svc from "./audit.service";

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { logs, total } = await svc.getLogs({
    page, limit,
    userId: req.query.userId as string | undefined,
    module: req.query.module as string | undefined,
    action: req.query.action as string | undefined,
    from:   req.query.from   ? new Date(req.query.from as string) : undefined,
    to:     req.query.to     ? new Date(req.query.to   as string) : undefined,
  });
  ApiRes.paginated(res, logs, buildPaginationMeta(total, page, limit));
});

export const getLog = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getLogById(req.params.id));
});

export const getModules = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getModuleList());
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getLogStats());
});
