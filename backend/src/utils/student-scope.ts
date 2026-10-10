import { prisma } from "../config/database";

/** The studentProfile id that belongs to a user (or null if the user is not a student). */
export async function ownStudentProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } });
  return profile?.id ?? null;
}
