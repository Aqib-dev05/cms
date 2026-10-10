import { getData, getDataOr, sendData } from "@/lib/api-helpers";
import { fetchPaginated, type PageParams } from "@/lib/pagination";
import type { PaginatedResponse } from "@/types";
import type { ActiveIssue, Book, BookBody, BookDetail, HistoryIssue, OverdueIssue } from "./types";

export const fetchBooks = (params: PageParams & { category?: string }): Promise<PaginatedResponse<Book>> => fetchPaginated<Book, PageParams & { category?: string }>("/library/books", params);
export const fetchBook = (id: string) => getData<BookDetail>(`/library/books/${id}`);
export const fetchActiveIssues = (params: PageParams): Promise<PaginatedResponse<ActiveIssue>> => fetchPaginated<ActiveIssue>("/library/issues/active", params);
export const fetchOverdue = () => getDataOr<OverdueIssue[]>("/library/issues/overdue", []);
export const fetchHistory = (studentProfileId: string) => getDataOr<HistoryIssue[]>(`/library/students/${studentProfileId}/history`, []);

export const createBook = (b: BookBody & { totalCopies: number }) => sendData<Book>("post", "/library/books", b);
export const updateBook = ({ id, ...b }: Partial<Omit<BookBody, "isbn">> & { id: string }) => sendData<Book>("patch", `/library/books/${id}`, b);
export const addCopies = ({ id, count }: { id: string; count: number }) => sendData("post", `/library/books/${id}/copies`, { count });
export const issueBook = (b: { bookCopyId: string; studentProfileId: string; dueDate: string }) => sendData("post", "/library/issues", b);
export const returnBook = (issueId: string) => sendData<{ fine: number; daysLate: number }>("patch", `/library/issues/${issueId}/return`);
