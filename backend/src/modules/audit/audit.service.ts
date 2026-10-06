import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";

export async function getLogs(params: {
  page:     number;
  limit:    number;
  userId?:  string;
  module?:  string;
  action?:  string;
  from?:    Date;
  to?:      Date;
}) {
  const { page, limit, userId, module, action, from, to } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(userId && { userId }),
    ...(module && { module }),
    ...(action && { action }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to   && { lte: to   }),
      },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            username: true,
            role:     { select: { name: true } },
            staffProfile:   { select: { firstName: true, lastName: true } },
            studentProfile: { select: { firstName: true, lastName: true, registrationNo: true } },
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getLogById(id: string) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, role: { select: { name: true } } } },
    },
  });
  if (!log) throw AppError.notFound("Audit log not found");
  return log;
}

export async function getModuleList() {
  const modules = await prisma.auditLog.groupBy({
    by:     ["module"],
    _count: { id: true },
    orderBy: { module: "asc" },
  });
  return modules;
}

export async function getLogStats() {
  const [byModule, byAction, recentActivity] = await Promise.all([
    prisma.auditLog.groupBy({
      by:     ["module"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take:  10,
    }),
    prisma.auditLog.groupBy({
      by:     ["action"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take:  10,
    }),
    prisma.auditLog.findMany({
      take:    10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true } } },
    }),
  ]);

  return { byModule, byAction, recentActivity };
}
