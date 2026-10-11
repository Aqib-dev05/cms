import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { resolveUserPermissions } from "../../middlewares/permission.middleware";
import { sendPdf, sendXlsx } from "./export.engine";
import { RESOURCES, type ExportQuery } from "./export.service";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const querySchema = z.object({
  format:     z.enum(["xlsx", "pdf"]).default("xlsx"),
  from:       day.optional(),
  to:         day.optional(),
  status:     z.string().max(30).optional(),
  type:       z.string().max(30).optional(),
  programId:  z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  sectionId:  z.string().uuid().optional(),
  examId:     z.string().uuid().optional(),
  search:     z.string().max(100).optional(),
});

export const listResources = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const perms = new Set(await resolveUserPermissions(req.user.userId));
  const allowed = Object.entries(RESOURCES)
    .filter(([, d]) => (d.roles ? d.roles.includes(req.user!.roleName) : d.permission ? perms.has(d.permission) : true))
    .map(([key, d]) => ({ key, label: d.label }));
  res.status(200).json({ success: true, message: "Success", data: allowed });
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const def = RESOURCES[req.params.resource];
  if (!def) throw AppError.notFound("Unknown export");

  if (def.roles && !def.roles.includes(req.user.roleName)) throw AppError.forbidden("This export isn't available for your account");
  if (def.permission) {
    const perms = await resolveUserPermissions(req.user.userId);
    if (!perms.includes(def.permission)) throw AppError.forbidden("You do not have permission to export this");
  }

  const { format, from, to, ...rest } = querySchema.parse(req.query);
  const q: ExportQuery = {
    ...rest,
    from: from ? new Date(`${from}T00:00:00+05:00`) : undefined,
    to:   to   ? new Date(`${to}T23:59:59.999+05:00`) : undefined,
  };

  const table = await def.build(req.user, q);
  if (format === "pdf") sendPdf(res, table);
  else await sendXlsx(res, table);
});
