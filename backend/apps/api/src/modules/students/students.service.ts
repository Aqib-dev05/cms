import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { generateRegistrationNo, generateCollegeEmail } from "../../utils/reg-no";
import { env } from "../../config/env";

export interface CreateStudentDto {
  // User account
  username:      string;
  email:         string;
  password:      string;
  // Profile
  firstName:     string;
  lastName:      string;
  fatherName?:   string;
  gender?:       "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?:  Date;
  cnic?:         string;
  phone?:        string;
  personalEmail?: string;
  address?:      string;
  // Academic
  programId:     string;
  enrollmentDate: Date;
}

export interface UpdateStudentProfileDto {
  firstName?:    string;
  lastName?:     string;
  fatherName?:   string;
  phone?:        string;
  address?:      string;
  personalEmail?: string;
  currentSemester?: number;
}

export interface EnrollStudentDto {
  sectionId: string;
}

export interface UpdateStudentStatusDto {
  status: "ACTIVE" | "SUSPENDED" | "EXPELLED" | "ON_LEAVE" | "DROPPED_OUT" | "GRADUATED";
  note?:  string;
}

const STUDENT_SELECT = {
  id: true,
  username: true,
  email: true,
  collegeEmail: true,
  isActive: true,
  createdAt: true,
  studentProfile: {
    include: {
      program: { select: { name: true, code: true, department: { select: { name: true } } } },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────
//  QUERIES
// ─────────────────────────────────────────────────────────────

export async function getStudents(params: {
  page: number;
  limit: number;
  programId?:   string;
  semesterId?:  string;
  status?:      string;
  search?:      string;
}) {
  const { page, limit, programId, semesterId, status, search } = params;
  const skip = (page - 1) * limit;

  const where = {
    role: { name: "STUDENT" as const },
    ...(status && { studentProfile: { status: status as "ACTIVE" } }),
    ...(programId && { studentProfile: { programId } }),
    ...(semesterId && {
      studentProfile: {
        enrollments: { some: { section: { semesterId }, isActive: true } },
      },
    }),
    ...(search && {
      OR: [
        { username: { contains: search, mode: "insensitive" as const } },
        { studentProfile: { registrationNo: { contains: search, mode: "insensitive" as const } } },
        { studentProfile: { firstName:     { contains: search, mode: "insensitive" as const } } },
        { studentProfile: { lastName:      { contains: search, mode: "insensitive" as const } } },
        { studentProfile: { cnic:          { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: STUDENT_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return { students, total };
}

export async function getStudentById(id: string) {
  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      studentProfile: {
        include: {
          program: {
            include: { department: { select: { name: true, code: true } } },
          },
          enrollments: {
            where: { isActive: true },
            include: {
              section: {
                include: {
                  course:   { select: { name: true, code: true, creditHours: true } },
                  semester: { select: { semesterNumber: true, type: true } },
                  teachers: {
                    where: { isPrimary: true },
                    include: {
                      staffProfile: { select: { firstName: true, lastName: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student || student.studentProfile === null) throw AppError.notFound("Student not found");
  return student;
}

export async function getStudentByRegNo(registrationNo: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { registrationNo },
    include: {
      user: { select: { id: true, username: true, email: true, collegeEmail: true, isActive: true } },
      program: { select: { name: true, code: true } },
    },
  });
  if (!profile) throw AppError.notFound("Student not found");
  return profile;
}

// ─────────────────────────────────────────────────────────────
//  CREATE STUDENT
// ─────────────────────────────────────────────────────────────

export async function createStudent(dto: CreateStudentDto) {
  // Validate unique username/email
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username: dto.username }, { email: dto.email }] },
  });
  if (existingUser) {
    throw AppError.conflict(
      existingUser.username === dto.username ? "Username already taken" : "Email already in use"
    );
  }

  // Validate program exists
  const program = await prisma.program.findUnique({ where: { id: dto.programId } });
  if (!program) throw AppError.notFound("Program not found");

  // Validate CNIC uniqueness if provided
  if (dto.cnic) {
    const existingCnic = await prisma.studentProfile.findUnique({ where: { cnic: dto.cnic } });
    if (existingCnic) throw AppError.conflict("CNIC already registered");
  }

  const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
  if (!studentRole) throw AppError.internal("Student role not found. Run seed first.");

  const passwordHash    = await bcrypt.hash(dto.password, 12);
  const registrationNo  = await generateRegistrationNo(program.code);
  const collegeEmail    = env.COLLEGE_EMAIL_ENABLED
    ? generateCollegeEmail(dto.firstName, dto.lastName, env.COLLEGE_EMAIL_DOMAIN)
    : undefined;

  return prisma.user.create({
    data: {
      username:     dto.username,
      email:        dto.email,
      collegeEmail,
      passwordHash,
      roleId:       studentRole.id,
      studentProfile: {
        create: {
          registrationNo,
          firstName:     dto.firstName,
          lastName:      dto.lastName,
          fatherName:    dto.fatherName,
          gender:        dto.gender,
          dateOfBirth:   dto.dateOfBirth,
          cnic:          dto.cnic,
          phone:         dto.phone,
          personalEmail: dto.personalEmail,
          address:       dto.address,
          programId:     dto.programId,
          enrollmentDate: dto.enrollmentDate,
          currentSemester: 1,
        },
      },
    },
    select: {
      id: true, username: true, email: true, collegeEmail: true,
      studentProfile: {
        select: {
          registrationNo: true, firstName: true, lastName: true,
          program: { select: { name: true, code: true } },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────
//  BULK IMPORT — CSV
// ─────────────────────────────────────────────────────────────

export async function bulkCreateStudents(
  rows: CreateStudentDto[]
): Promise<{ success: number; failed: { row: number; reason: string }[] }> {
  const results = { success: 0, failed: [] as { row: number; reason: string }[] };

  for (let i = 0; i < rows.length; i++) {
    try {
      await createStudent(rows[i]);
      results.success++;
    } catch (err) {
      results.failed.push({
        row: i + 1,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────────────

export async function updateStudentProfile(userId: string, dto: UpdateStudentProfileDto) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student profile not found");
  return prisma.studentProfile.update({ where: { userId }, data: dto });
}

export async function updateStudentStatus(userId: string, dto: UpdateStudentStatusDto) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student not found");

  const updatedProfile = await prisma.studentProfile.update({
    where: { userId },
    data: { status: dto.status },
  });

  // Deactivate user account on suspension/expulsion
  if (dto.status === "SUSPENDED" || dto.status === "EXPELLED") {
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  }

  // Reactivate if going back to ACTIVE
  if (dto.status === "ACTIVE") {
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  }

  return updatedProfile;
}

// ─────────────────────────────────────────────────────────────
//  ENROLLMENT
// ─────────────────────────────────────────────────────────────

export async function enrollStudent(userId: string, dto: EnrollStudentDto) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student not found");

  const section = await prisma.section.findUnique({
    where: { id: dto.sectionId },
    include: { _count: { select: { enrollments: true } } },
  });
  if (!section) throw AppError.notFound("Section not found");

  // Capacity check
  if (section._count.enrollments >= section.capacity) {
    throw AppError.badRequest(`Section is full (capacity: ${section.capacity})`);
  }

  // Duplicate enrollment check
  const existing = await prisma.enrollment.findUnique({
    where: { studentProfileId_sectionId: { studentProfileId: profile.id, sectionId: dto.sectionId } },
  });
  if (existing) throw AppError.conflict("Student already enrolled in this section");

  return prisma.enrollment.create({
    data: { studentProfileId: profile.id, sectionId: dto.sectionId },
    include: {
      section: {
        include: {
          course:   { select: { name: true, code: true } },
          semester: { select: { semesterNumber: true, type: true } },
        },
      },
    },
  });
}

export async function unenrollStudent(userId: string, sectionId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student not found");

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentProfileId_sectionId: { studentProfileId: profile.id, sectionId } },
  });
  if (!enrollment) throw AppError.notFound("Enrollment not found");

  await prisma.enrollment.delete({
    where: { studentProfileId_sectionId: { studentProfileId: profile.id, sectionId } },
  });
}

export async function getStudentEnrollments(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student not found");

  return prisma.enrollment.findMany({
    where: { studentProfileId: profile.id, isActive: true },
    include: {
      section: {
        include: {
          course:   { select: { name: true, code: true, creditHours: true } },
          semester: { select: { semesterNumber: true, type: true, isActive: true } },
          teachers: {
            where: { isPrimary: true },
            include: { staffProfile: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });
}
