import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import type { JwtPayload } from "../../middlewares/auth.middleware";

export type Actor = Pick<JwtPayload, "userId" | "roleName">;

/** Teachers may mark / correct attendance only this many days back. HOD + ADMIN have no limit. */
export const EDIT_WINDOW_DAYS = 7;

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function getStaffScope(userId: string) {
  return prisma.staffProfile.findUnique({
    where: { userId },
    select: { id: true, departmentId: true },
  });
}

/**
 * Can this actor mark / edit / see the roster of a section?
 *  - ADMIN: every section
 *  - TEACHER: only sections where they are assigned (CourseTeacher)
 *  - HOD: sections they teach + every section of a course in their own department
 *  - anyone else (e.g. STUDENT): no
 */
export async function canManageSection(actor: Actor, sectionId: string): Promise<boolean> {
  if (actor.roleName === "ADMIN") return true;
  if (actor.roleName !== "TEACHER" && actor.roleName !== "HOD") return false;

  const staff = await getStaffScope(actor.userId);
  if (!staff) return false;

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      course: { select: { departmentId: true } },
      teachers: { where: { staffProfileId: staff.id }, select: { staffProfileId: true } },
    },
  });
  if (!section) throw AppError.notFound("Section not found");

  if (section.teachers.length > 0) return true;
  return actor.roleName === "HOD" && !!staff.departmentId && section.course.departmentId === staff.departmentId;
}

export async function assertCanManageSection(actor: Actor, sectionId: string): Promise<void> {
  if (!(await canManageSection(actor, sectionId))) {
    throw AppError.forbidden("You can only access attendance of sections you teach");
  }
}

/**
 * Can this actor read the attendance of the student with this *user* id?
 *  - STUDENT: only themselves
 *  - ADMIN: everyone
 *  - TEACHER / HOD: students enrolled in a section they can manage
 *    (HOD also: students of a program that belongs to their department)
 */
export async function assertCanViewStudent(actor: Actor, targetUserId: string): Promise<void> {
  if (actor.roleName === "ADMIN") return;
  if (actor.roleName === "STUDENT") {
    if (actor.userId !== targetUserId) throw AppError.forbidden("You can only view your own attendance");
    return;
  }
  if (actor.roleName !== "TEACHER" && actor.roleName !== "HOD") throw AppError.forbidden();

  const staff = await getStaffScope(actor.userId);
  if (!staff) throw AppError.forbidden();

  const deptId = actor.roleName === "HOD" ? staff.departmentId : null;
  const allowed = await prisma.studentProfile.findFirst({
    where: {
      userId: targetUserId,
      OR: [
        { enrollments: { some: { section: { teachers: { some: { staffProfileId: staff.id } } } } } },
        ...(deptId
          ? [
              { program: { departmentId: deptId } },
              { enrollments: { some: { section: { course: { departmentId: deptId } } } } },
            ]
          : []),
      ],
    },
    select: { id: true },
  });
  if (!allowed) throw AppError.forbidden("This student is not in any of your sections");
}

/** Teachers are limited to the last EDIT_WINDOW_DAYS days; HOD/ADMIN are not. */
export function assertWithinEditWindow(actor: Actor, sessionDate: Date): void {
  if (actor.roleName !== "TEACHER") return;
  const cutoff = startOfTodayUtc();
  cutoff.setUTCDate(cutoff.getUTCDate() - EDIT_WINDOW_DAYS);
  if (sessionDate < cutoff) {
    throw AppError.forbidden(
      `Teachers can only change attendance up to ${EDIT_WINDOW_DAYS} days back. Ask your HOD or an admin to correct older records.`
    );
  }
}

export function assertNotFuture(date: Date): void {
  const endOfToday = startOfTodayUtc();
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
  if (date >= endOfToday) throw AppError.badRequest("Cannot mark attendance for a future date");
}
