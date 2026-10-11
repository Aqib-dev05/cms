import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { audit } from "../../utils/audit-logger";

/** Money in from outside the fee system, and money out. Fee collections are NOT entered here — the summary reads verified payments directly so nothing is counted twice. */
export const FUND_CATEGORIES = {
  INCOME: ["GOVERNMENT_GRANT", "DONATION", "ENDOWMENT_INVESTMENT", "OTHER_INCOME"],
  EXPENSE: ["SALARIES", "UTILITIES", "MAINTENANCE", "EQUIPMENT", "SCHOLARSHIPS", "EVENTS", "OTHER_EXPENSE"],
} as const;

export interface CreateFundEntryDto {
  type:        "INCOME" | "EXPENSE";
  category:    string;
  source?:     string;
  amount:      number;
  entryDate:   Date;
  description: string;
  reference?:  string;
}

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // Pakistan time, fixed UTC+5 (same rule as analytics)

function pktMonthKey(d: Date): string {
  return new Date(d.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 7);
}

function lastMonthKeys(count: number, now = new Date()): string[] {
  const base = new Date(now.getTime() + PKT_OFFSET_MS);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

export function getCategories() {
  return FUND_CATEGORIES;
}

export async function createEntry(dto: CreateFundEntryDto, recordedById: string) {
  const allowed: readonly string[] = FUND_CATEGORIES[dto.type];
  if (!allowed.includes(dto.category)) {
    throw AppError.badRequest(`Category "${dto.category}" is not valid for ${dto.type.toLowerCase()}`);
  }
  if (dto.amount <= 0) throw AppError.badRequest("Amount must be greater than 0");
  if (dto.entryDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw AppError.badRequest("Entry date can't be in the future");
  }

  const entry = await prisma.fundEntry.create({
    data: { ...dto, recordedById },
    include: { recordedBy: { select: { username: true, staffProfile: { select: { firstName: true, lastName: true } } } } },
  });

  await audit({
    userId: recordedById, action: "FUND_ENTRY_CREATE", module: "fund", entityId: entry.id,
    newData: { type: dto.type, category: dto.category, amount: dto.amount },
  });
  return entry;
}

export async function listEntries(params: {
  page: number; limit: number;
  type?: "INCOME" | "EXPENSE"; category?: string;
  from?: Date; to?: Date; search?: string; includeVoided?: boolean;
}) {
  const { page, limit, type, category, from, to, search, includeVoided } = params;
  const where = {
    ...(type     && { type }),
    ...(category && { category }),
    ...(!includeVoided && { isVoided: false }),
    ...((from || to) && { entryDate: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: "insensitive" as const } },
        { source:      { contains: search, mode: "insensitive" as const } },
        { reference:   { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [entries, total] = await Promise.all([
    prisma.fundEntry.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      include: { recordedBy: { select: { username: true, staffProfile: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.fundEntry.count({ where }),
  ]);
  return { entries, total };
}

export async function voidEntry(id: string, reason: string, voidedById: string) {
  const entry = await prisma.fundEntry.findUnique({ where: { id } });
  if (!entry) throw AppError.notFound("Fund entry not found");
  if (entry.isVoided) throw AppError.badRequest("Entry is already voided");

  const updated = await prisma.fundEntry.update({
    where: { id },
    data: { isVoided: true, voidedAt: new Date(), voidReason: reason },
  });
  await audit({
    userId: voidedById, action: "FUND_ENTRY_VOID", module: "fund", entityId: id,
    oldData: { amount: entry.amount, type: entry.type }, newData: { reason },
  });
  return updated;
}

async function totalsBetween(from?: Date, to?: Date) {
  const paidAt    = (from || to) ? { paidAt:    { ...(from && { gte: from }), ...(to && { lte: to }) } } : {};
  const entryDate = (from || to) ? { entryDate: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {};

  const [fees, entries] = await Promise.all([
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { verificationStatus: "VERIFIED", ...paidAt } }),
    prisma.fundEntry.groupBy({ by: ["type"], _sum: { amount: true }, where: { isVoided: false, ...entryDate } }),
  ]);

  const sum = (t: "INCOME" | "EXPENSE") =>
    entries.find((e: { type: string }) => e.type === t)?._sum.amount ?? 0;

  const feeCollected = fees._sum.amount ?? 0;
  const otherIncome  = sum("INCOME");
  const expenses     = sum("EXPENSE");
  return { feeCollected, otherIncome, expenses, net: feeCollected + otherIncome - expenses };
}

export async function getSummary(from?: Date, to?: Date) {
  const monthsBack = 6;
  const monthKeys = lastMonthKeys(monthsBack);
  const since = new Date(`${monthKeys[0]}-01T00:00:00+05:00`);

  const [allTime, period, byCategory, payments, entries] = await Promise.all([
    totalsBetween(),
    totalsBetween(from, to),
    prisma.fundEntry.groupBy({
      by: ["type", "category"], _sum: { amount: true },
      where: {
        isVoided: false,
        ...((from || to) && { entryDate: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
      },
    }),
    prisma.feePayment.findMany({
      where: { verificationStatus: "VERIFIED", paidAt: { gte: since } },
      select: { amount: true, paidAt: true },
    }),
    prisma.fundEntry.findMany({
      where: { isVoided: false, entryDate: { gte: since } },
      select: { type: true, amount: true, entryDate: true },
    }),
  ]);

  const monthly = new Map(monthKeys.map((m) => [m, { month: m, income: 0, expense: 0 }]));
  for (const p of payments) {
    const row = monthly.get(pktMonthKey(p.paidAt));
    if (row) row.income += p.amount;
  }
  for (const e of entries) {
    const row = monthly.get(pktMonthKey(e.entryDate));
    if (!row) continue;
    if (e.type === "INCOME") row.income += e.amount; else row.expense += e.amount;
  }

  return {
    balance: allTime.net,
    allTime,
    period: { from: from ?? null, to: to ?? null, ...period },
    byCategory: byCategory.map((r: { type: string; category: string; _sum: { amount: number | null } }) => ({
      type: r.type, category: r.category, total: r._sum.amount ?? 0,
    })),
    monthly: [...monthly.values()],
  };
}
