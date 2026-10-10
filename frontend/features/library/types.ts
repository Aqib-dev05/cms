export type BookStatus = "AVAILABLE" | "ISSUED" | "RESERVED" | "LOST" | "DAMAGED" | "UNDER_REPAIR";

export interface BookCopySummary {
  id: string;
  status: BookStatus;
  copyNumber: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  edition: string | null;
  year: number | null;
  category: string | null;
  totalCopies: number;
  isActive: boolean;
  copies: BookCopySummary[];
  _count: { copies: number };
}

export interface StudentRef {
  registrationNo: string;
  firstName: string;
  lastName: string;
}

export interface BookDetail extends Omit<Book, "copies" | "_count"> {
  copies: (BookCopySummary & { location: string | null; issues: { id: string; dueDate: string; studentProfile: StudentRef }[] })[];
}

export interface ActiveIssue {
  id: string;
  issuedAt: string;
  dueDate: string;
  fine: number;
  isOverdue: boolean;
  daysOverdue: number;
  bookCopy: { copyNumber: string; book: { title: string; author: string; isbn: string | null } };
  studentProfile: StudentRef;
}

export interface OverdueIssue {
  id: string;
  dueDate: string;
  bookCopy: { copyNumber: string; book: { title: string } };
  studentProfile: StudentRef & { phone: string | null };
}

export interface HistoryIssue {
  id: string;
  issuedAt: string;
  dueDate: string;
  returnedAt: string | null;
  fine: number;
  finePaid: boolean;
  bookCopy: { copyNumber: string; book: { title: string; author: string } };
}

export interface BookBody {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  edition?: string;
  year?: number;
  category?: string;
}
