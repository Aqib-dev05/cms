export const NOTICE_AUDIENCES = ["ALL", "STUDENTS", "STAFF", "DEPARTMENT", "PROGRAM"] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: string | null;
  audience: NoticeAudience;
  departmentId: string | null;
  programId: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  isPublished: boolean;
  createdAt: string;
  createdBy: { username: string; staffProfile: { firstName: string; lastName: string } | null };
  _count?: { media: number };
}

export const authorName = (n: Pick<Notice, "createdBy">) => (n.createdBy.staffProfile ? `${n.createdBy.staffProfile.firstName} ${n.createdBy.staffProfile.lastName}` : n.createdBy.username);

export interface NoticeBody {
  title: string;
  content: string;
  category?: string;
  audience: NoticeAudience;
  departmentId?: string;
  programId?: string;
  expiresAt?: string;
}
