import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler";
import { ApiRes, getPaginationParams, buildPaginationMeta } from "../../utils/response";
import { AppError } from "../../utils/app-error";
import * as svc from "./library.service";

const bookSchema = z.object({
  title:       z.string().min(1).max(200),
  author:      z.string().min(1).max(200),
  isbn:        z.string().max(20).optional(),
  publisher:   z.string().max(100).optional(),
  edition:     z.string().max(50).optional(),
  year:        z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  category:    z.string().max(50).optional(),
  totalCopies: z.number().int().min(1).max(100),
});

const issueSchema = z.object({
  bookCopyId:       z.string().uuid(),
  studentProfileId: z.string().uuid(),
  dueDate:          z.string().transform((v) => new Date(v)),
});

export const getBooks = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { books, total } = await svc.getBooks({
    page, limit,
    search:   req.query.search   as string | undefined,
    category: req.query.category as string | undefined,
  });
  ApiRes.paginated(res, books, buildPaginationMeta(total, page, limit));
});

export const getBook = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getBookById(req.params.id));
});

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const dto = bookSchema.parse(req.body);
  ApiRes.created(res, await svc.createBook(dto), "Book added to library");
});

export const updateBook = asyncHandler(async (req: Request, res: Response) => {
  const dto = bookSchema.omit({ totalCopies: true, isbn: true }).partial().parse(req.body);
  ApiRes.success(res, await svc.updateBook(req.params.id, dto), "Book updated");
});

export const addCopies = asyncHandler(async (req: Request, res: Response) => {
  const { count } = z.object({ count: z.number().int().min(1).max(50) }).parse(req.body);
  ApiRes.success(res, await svc.addCopies(req.params.id, count), `${count} copies added`);
});

export const issueBook = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const dto = issueSchema.parse(req.body);
  ApiRes.created(res, await svc.issueBook(dto, req.user.userId), "Book issued successfully");
});

export const returnBook = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  ApiRes.success(res, await svc.returnBook(req.params.issueId, req.user.userId), "Book returned");
});

export const getActiveIssues = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query as Record<string, string>);
  const { issues, total } = await svc.getActiveIssues({ page, limit, search: req.query.search as string | undefined });
  ApiRes.paginated(res, issues, buildPaginationMeta(total, page, limit));
});

export const getOverdueIssues = asyncHandler(async (_req: Request, res: Response) => {
  ApiRes.success(res, await svc.getOverdueIssues());
});

export const getStudentHistory = asyncHandler(async (req: Request, res: Response) => {
  ApiRes.success(res, await svc.getStudentIssueHistory(req.params.studentProfileId));
});
