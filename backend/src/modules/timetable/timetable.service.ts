import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";

export interface CreateSlotDto {
  sectionId:  string;
  dayOfWeek:  number;   // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  startTime:  string;   // "08:00"
  endTime:    string;   // "09:30"
  room?:      string;
}

export interface UpdateSlotDto {
  dayOfWeek?: number;
  startTime?: string;
  endTime?:   string;
  room?:      string;
}

function validateTime(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (sh * 60 + sm >= eh * 60 + em) {
    throw AppError.badRequest("End time must be after start time");
  }
}

async function checkConflict(
  sectionId: string,
  dayOfWeek: number,
  startTime: string,
  endTime:   string,
  excludeId?: string
) {
  // Get section's teacher to check teacher conflict too
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { teachers: true },
  });
  if (!section) throw AppError.notFound("Section not found");

  const existingSlots = await prisma.timetableSlot.findMany({
    where: {
      dayOfWeek,
      id: excludeId ? { not: excludeId } : undefined,
      section: {
        OR: [
          { id: sectionId },
          // Check if teacher has another class at same time
          ...(section.teachers.length > 0
            ? [{ teachers: { some: { staffProfileId: { in: section.teachers.map((t: { staffProfileId: string }) => t.staffProfileId) } } } }]
            : []),
        ],
      },
    },
  });

  for (const slot of existingSlots) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const [ssh, ssm] = slot.startTime.split(":").map(Number);
    const [seh, sem] = slot.endTime.split(":").map(Number);

    const newStart  = sh * 60 + sm;
    const newEnd    = eh * 60 + em;
    const slotStart = ssh * 60 + ssm;
    const slotEnd   = seh * 60 + sem;

    if (newStart < slotEnd && newEnd > slotStart) {
      if (slot.sectionId === sectionId) {
        throw AppError.conflict(`Time conflict: this section already has a slot on this day overlapping ${slot.startTime}–${slot.endTime}`);
      } else {
        throw AppError.conflict(`Teacher conflict: teacher already has a class at ${slot.startTime}–${slot.endTime} on this day`);
      }
    }
  }
}

export async function getSectionTimetable(sectionId: string) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw AppError.notFound("Section not found");

  return prisma.timetableSlot.findMany({
    where: { sectionId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function getTeacherTimetable(staffProfileId: string) {
  return prisma.timetableSlot.findMany({
    where: { section: { teachers: { some: { staffProfileId } } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    include: {
      section: {
        include: { course: { select: { name: true, code: true } } },
      },
    },
  });
}

export async function getStudentTimetable(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student not found");

  return prisma.timetableSlot.findMany({
    where: {
      section: {
        enrollments: { some: { studentProfileId: profile.id, isActive: true } },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    include: {
      section: { include: { course: { select: { name: true, code: true } } } },
    },
  });
}

export async function createSlot(dto: CreateSlotDto) {
  validateTime(dto.startTime, dto.endTime);
  await checkConflict(dto.sectionId, dto.dayOfWeek, dto.startTime, dto.endTime);

  return prisma.timetableSlot.create({ data: dto });
}

export async function updateSlot(id: string, dto: UpdateSlotDto) {
  const slot = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!slot) throw AppError.notFound("Timetable slot not found");

  const newStart = dto.startTime ?? slot.startTime;
  const newEnd   = dto.endTime   ?? slot.endTime;
  const newDay   = dto.dayOfWeek ?? slot.dayOfWeek;

  validateTime(newStart, newEnd);
  await checkConflict(slot.sectionId, newDay, newStart, newEnd, id);

  return prisma.timetableSlot.update({ where: { id }, data: dto });
}

export async function deleteSlot(id: string) {
  const slot = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!slot) throw AppError.notFound("Timetable slot not found");
  await prisma.timetableSlot.delete({ where: { id } });
}
