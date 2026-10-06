import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";

export interface CreateBookDto {
  title:      string;
  author:     string;
  isbn?:      string;
  publisher?: string;
  edition?:   string;
  year?:      number;
  category?:  string;
  totalCopies: number;
}

export interface UpdateBookDto {
  title?:      string;
  author?:     string;
  publisher?:  string;
  edition?:    string;
  year?:       number;
  category?:   string;
  isActive?:   boolean;
}

export interface IssueBookDto {
  bookCopyId:       string;
  studentProfileId: string;
  dueDate:          Date;
}

const FINE_PER_DAY = 5; // Rs. 5 per day overdue

// ─── Books ────────────────────────────────────────────────────

export async function getBooks(params: {
  search?:   string;
  category?: string;
  page:      number;
  limit:     number;
}) {
  const { search, category, page, limit } = params;
  const skip = (page - 1) * limit;

  const where = {
    isActive: true,
    ...(category && { category }),
    ...(search   && {
      OR: [
        { title:  { contains: search, mode: "insensitive" as const } },
        { author: { contains: search, mode: "insensitive" as const } },
        { isbn:   { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy: { title: "asc" },
      include: {
        copies: { select: { id: true, status: true, copyNumber: true } },
        _count: { select: { copies: true } },
      },
    }),
    prisma.book.count({ where }),
  ]);

  return { books, total };
}

export async function getBookById(id: string) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      copies: {
        include: {
          issues: {
            where: { returnedAt: null },
            include: {
              studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!book) throw AppError.notFound("Book not found");
  return book;
}

export async function createBook(dto: CreateBookDto) {
  if (dto.isbn) {
    const existing = await prisma.book.findUnique({ where: { isbn: dto.isbn } });
    if (existing) throw AppError.conflict("A book with this ISBN already exists");
  }

  return prisma.book.create({
    data: {
      title:       dto.title,
      author:      dto.author,
      isbn:        dto.isbn,
      publisher:   dto.publisher,
      edition:     dto.edition,
      year:        dto.year,
      category:    dto.category,
      totalCopies: dto.totalCopies,
      copies: {
        create: Array.from({ length: dto.totalCopies }, (_, i) => ({
          copyNumber: String(i + 1).padStart(3, "0"),
          status:     "AVAILABLE" as const,
        })),
      },
    },
    include: { copies: true },
  });
}

export async function updateBook(id: string, dto: UpdateBookDto) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw AppError.notFound("Book not found");
  return prisma.book.update({ where: { id }, data: dto });
}

export async function addCopies(bookId: string, count: number) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { _count: { select: { copies: true } } },
  });
  if (!book) throw AppError.notFound("Book not found");

  const existingCount = book._count.copies;

  const newCopies = await prisma.bookCopy.createMany({
    data: Array.from({ length: count }, (_: unknown, i: number) => ({
      bookId,
      copyNumber: String(existingCount + i + 1).padStart(3, "0"),
      status:     "AVAILABLE" as const,
    })),
  });

  await prisma.book.update({
    where: { id: bookId },
    data: { totalCopies: existingCount + count },
  });

  return newCopies;
}

// ─── Issue & Return ───────────────────────────────────────────

export async function issueBook(dto: IssueBookDto, issuedById: string) {
  const [copy, student] = await Promise.all([
    prisma.bookCopy.findUnique({ where: { id: dto.bookCopyId } }),
    prisma.studentProfile.findUnique({ where: { id: dto.studentProfileId } }),
  ]);

  if (!copy)    throw AppError.notFound("Book copy not found");
  if (!student) throw AppError.notFound("Student not found");
  if (copy.status !== "AVAILABLE") {
    throw AppError.badRequest(`This copy is currently ${copy.status.toLowerCase()}`);
  }

  // Check student doesn't have too many books (max 3)
  const activeIssues = await prisma.bookIssue.count({
    where: { studentProfileId: dto.studentProfileId, returnedAt: null },
  });
  if (activeIssues >= 3) {
    throw AppError.badRequest("Student has reached the maximum limit of 3 issued books");
  }

  const [issue] = await prisma.$transaction([
    prisma.bookIssue.create({
      data: {
        bookCopyId:       dto.bookCopyId,
        studentProfileId: dto.studentProfileId,
        dueDate:          dto.dueDate,
        issuedById,
      },
      include: {
        bookCopy: { include: { book: { select: { title: true, author: true } } } },
        studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } },
      },
    }),
    prisma.bookCopy.update({
      where: { id: dto.bookCopyId },
      data:  { status: "ISSUED" },
    }),
  ]);

  return issue;
}

export async function returnBook(issueId: string, returnedById: string) {
  const issue = await prisma.bookIssue.findUnique({
    where: { id: issueId },
    include: { bookCopy: true },
  });
  if (!issue)            throw AppError.notFound("Issue record not found");
  if (issue.returnedAt)  throw AppError.badRequest("Book already returned");

  const returnedAt = new Date();
  const dueDate    = new Date(issue.dueDate);
  let fine         = 0;

  if (returnedAt > dueDate) {
    const daysLate = Math.ceil((returnedAt.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    fine = daysLate * FINE_PER_DAY;
  }

  const [updated] = await prisma.$transaction([
    prisma.bookIssue.update({
      where: { id: issueId },
      data:  { returnedAt, fine, returnedById },
    }),
    prisma.bookCopy.update({
      where: { id: issue.bookCopyId },
      data:  { status: "AVAILABLE" },
    }),
  ]);

  return { ...updated, fine, daysLate: fine > 0 ? Math.ceil(fine / FINE_PER_DAY) : 0 };
}

// ─── History & Reports ────────────────────────────────────────

export async function getActiveIssues(params: { page: number; limit: number; search?: string }) {
  const { page, limit, search } = params;
  const skip = (page - 1) * limit;

  const where = {
    returnedAt: null,
    ...(search && {
      studentProfile: {
        OR: [
          { registrationNo: { contains: search, mode: "insensitive" as const } },
          { firstName:      { contains: search, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [issues, total] = await Promise.all([
    prisma.bookIssue.findMany({
      where,
      skip,
      take: limit,
      orderBy: { dueDate: "asc" },
      include: {
        bookCopy:      { include: { book: { select: { title: true, author: true, isbn: true } } } },
        studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } },
      },
    }),
    prisma.bookIssue.count({ where }),
  ]);

  const now = new Date();
  const issuesWithStatus = issues.map((i: typeof issues[number]) => (({
    ...i,
    isOverdue:  i.dueDate < now,
    daysOverdue: i.dueDate < now
      ? Math.ceil((now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0,
  })));

  return { issues: issuesWithStatus, total };
}

export async function getStudentIssueHistory(studentProfileId: string) {
  return prisma.bookIssue.findMany({
    where: { studentProfileId },
    orderBy: { issuedAt: "desc" },
    include: {
      bookCopy: { include: { book: { select: { title: true, author: true } } } },
    },
  });
}

export async function getOverdueIssues() {
  const now = new Date();
  return prisma.bookIssue.findMany({
    where: { returnedAt: null, dueDate: { lt: now } },
    orderBy: { dueDate: "asc" },
    include: {
      bookCopy:      { include: { book: { select: { title: true } } } },
      studentProfile: { select: { registrationNo: true, firstName: true, lastName: true, phone: true } },
    },
  });
}
