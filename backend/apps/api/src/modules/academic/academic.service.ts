import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import type {
  CreateDepartmentDto, UpdateDepartmentDto, AssignHodDto,
  CreateProgramDto, UpdateProgramDto,
  CreateSessionDto, UpdateSessionDto,
  CreateSemesterDto, UpdateSemesterDto,
  CreateCourseDto, UpdateCourseDto, AssignCourseToSemesterDto,
  CreateSectionDto, UpdateSectionDto, AssignTeacherDto,
} from "./academic.types";

// ─────────────────────────────────────────────────────────────
//  DEPARTMENTS
// ─────────────────────────────────────────────────────────────

export async function getDepartments(includeInactive = false) {
  return prisma.department.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { programs: true, staffProfiles: true } },
    },
  });
}

export async function getDepartmentById(id: string) {
  const dept = await prisma.department.findUnique({
    where: { id },
    include: {
      programs: { where: { isActive: true }, orderBy: { name: "asc" } },
      staffProfiles: {
        where: { status: "ACTIVE" },
        include: { user: { select: { role: { select: { name: true } } } } },
      },
      _count: { select: { programs: true, staffProfiles: true } },
    },
  });
  if (!dept) throw AppError.notFound("Department not found");
  return dept;
}

export async function createDepartment(dto: CreateDepartmentDto) {
  const existing = await prisma.department.findFirst({
    where: { OR: [{ name: dto.name }, { code: dto.code.toUpperCase() }] },
  });
  if (existing) {
    throw AppError.conflict(
      existing.code === dto.code.toUpperCase() ? "Department code already exists" : "Department name already exists"
    );
  }

  return prisma.department.create({
    data: { ...dto, code: dto.code.toUpperCase() },
  });
}

export async function updateDepartment(id: string, dto: UpdateDepartmentDto) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw AppError.notFound("Department not found");

  if (dto.code) dto.code = dto.code.toUpperCase();

  return prisma.department.update({ where: { id }, data: dto });
}

export async function assignHod(id: string, dto: AssignHodDto) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw AppError.notFound("Department not found");

  // Verify user exists and has HOD role
  const user = await prisma.user.findUnique({
    where: { id: dto.hodId },
    include: { role: true },
  });
  if (!user) throw AppError.notFound("User not found");
  if (user.role.name !== "HOD") throw AppError.badRequest("Assigned user must have the HOD role");

  // Update department's headId and also set staff's departmentId
  await prisma.$transaction([
    prisma.department.update({ where: { id }, data: { headId: dto.hodId } }),
    prisma.staffProfile.update({
      where: { userId: dto.hodId },
      data: { departmentId: id },
    }),
  ]);

  return prisma.department.findUnique({ where: { id } });
}

// ─────────────────────────────────────────────────────────────
//  PROGRAMS
// ─────────────────────────────────────────────────────────────

export async function getPrograms(departmentId?: string, includeInactive = false) {
  return prisma.program.findMany({
    where: {
      ...(departmentId && { departmentId }),
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { name: "asc" },
    include: {
      department: { select: { name: true, code: true } },
      _count: { select: { studentProfiles: true, academicSessions: true } },
    },
  });
}

export async function getProgramById(id: string) {
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      academicSessions: {
        orderBy: { startDate: "desc" },
        include: { _count: { select: { semesters: true } } },
      },
      _count: { select: { studentProfiles: true } },
    },
  });
  if (!program) throw AppError.notFound("Program not found");
  return program;
}

export async function createProgram(dto: CreateProgramDto) {
  const dept = await prisma.department.findUnique({ where: { id: dto.departmentId } });
  if (!dept) throw AppError.notFound("Department not found");

  const existing = await prisma.program.findUnique({ where: { code: dto.code.toUpperCase() } });
  if (existing) throw AppError.conflict("Program code already exists");

  return prisma.program.create({
    data: {
      ...dto,
      code: dto.code.toUpperCase(),
      durationYears: dto.durationYears ?? 4,
      totalSemesters: dto.totalSemesters ?? 8,
    },
    include: { department: { select: { name: true, code: true } } },
  });
}

export async function updateProgram(id: string, dto: UpdateProgramDto) {
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) throw AppError.notFound("Program not found");

  if (dto.code) dto.code = dto.code.toUpperCase();
  return prisma.program.update({ where: { id }, data: dto });
}

// ─────────────────────────────────────────────────────────────
//  ACADEMIC SESSIONS
// ─────────────────────────────────────────────────────────────

export async function getSessions(programId: string) {
  return prisma.academicSession.findMany({
    where: { programId },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { semesters: true } } },
  });
}

export async function getSessionById(id: string) {
  const session = await prisma.academicSession.findUnique({
    where: { id },
    include: {
      program: { select: { name: true, code: true } },
      semesters: { orderBy: { semesterNumber: "asc" } },
    },
  });
  if (!session) throw AppError.notFound("Academic session not found");
  return session;
}

export async function createSession(dto: CreateSessionDto) {
  const program = await prisma.program.findUnique({ where: { id: dto.programId } });
  if (!program) throw AppError.notFound("Program not found");

  if (dto.startDate >= dto.endDate) {
    throw AppError.badRequest("Start date must be before end date");
  }

  return prisma.academicSession.create({
    data: dto,
    include: { program: { select: { name: true, code: true } } },
  });
}

export async function updateSession(id: string, dto: UpdateSessionDto) {
  const session = await prisma.academicSession.findUnique({ where: { id } });
  if (!session) throw AppError.notFound("Session not found");

  // Only one session can be active per program at a time
  if (dto.isActive) {
    await prisma.academicSession.updateMany({
      where: { programId: session.programId, id: { not: id } },
      data: { isActive: false },
    });
  }

  return prisma.academicSession.update({ where: { id }, data: dto });
}

// ─────────────────────────────────────────────────────────────
//  SEMESTERS
// ─────────────────────────────────────────────────────────────

export async function getSemesters(sessionId: string) {
  return prisma.semester.findMany({
    where: { academicSessionId: sessionId },
    orderBy: { semesterNumber: "asc" },
    include: { _count: { select: { sections: true } } },
  });
}

export async function getSemesterById(id: string) {
  const semester = await prisma.semester.findUnique({
    where: { id },
    include: {
      academicSession: {
        include: { program: { select: { name: true, code: true } } },
      },
      courses: { select: { id: true, name: true, code: true, creditHours: true } },
      sections: { include: { course: { select: { name: true, code: true } } } },
    },
  });
  if (!semester) throw AppError.notFound("Semester not found");
  return semester;
}

export async function createSemester(dto: CreateSemesterDto) {
  const session = await prisma.academicSession.findUnique({ where: { id: dto.academicSessionId } });
  if (!session) throw AppError.notFound("Academic session not found");

  if (dto.startDate >= dto.endDate) {
    throw AppError.badRequest("Start date must be before end date");
  }

  return prisma.semester.create({
    data: dto,
    include: { academicSession: { select: { name: true } } },
  });
}

export async function updateSemester(id: string, dto: UpdateSemesterDto) {
  const semester = await prisma.semester.findUnique({ where: { id } });
  if (!semester) throw AppError.notFound("Semester not found");

  // Only one semester active per session
  if (dto.isActive) {
    await prisma.semester.updateMany({
      where: { academicSessionId: semester.academicSessionId, id: { not: id } },
      data: { isActive: false },
    });
  }

  return prisma.semester.update({ where: { id }, data: dto });
}

// ─────────────────────────────────────────────────────────────
//  COURSES
// ─────────────────────────────────────────────────────────────

export async function getCourses(params: {
  departmentId?: string;
  semesterId?: string;
  includeInactive?: boolean;
  search?: string;
}) {
  const { departmentId, semesterId, includeInactive, search } = params;

  return prisma.course.findMany({
    where: {
      ...(departmentId && { departmentId }),
      ...(semesterId && { semesters: { some: { id: semesterId } } }),
      ...(!includeInactive && { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    orderBy: { code: "asc" },
    include: {
      department: { select: { name: true, code: true } },
      _count: { select: { sections: true } },
    },
  });
}

export async function getCourseById(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      department: { select: { name: true, code: true } },
      semesters: { select: { id: true, semesterNumber: true, type: true } },
      sections: {
        include: {
          semester: { select: { semesterNumber: true, type: true } },
          teachers: {
            include: {
              staffProfile: { select: { firstName: true, lastName: true, designation: true } },
            },
          },
          _count: { select: { enrollments: true } },
        },
      },
    },
  });
  if (!course) throw AppError.notFound("Course not found");
  return course;
}

export async function createCourse(dto: CreateCourseDto) {
  const dept = await prisma.department.findUnique({ where: { id: dto.departmentId } });
  if (!dept) throw AppError.notFound("Department not found");

  const existing = await prisma.course.findUnique({ where: { code: dto.code.toUpperCase() } });
  if (existing) throw AppError.conflict("Course code already exists");

  return prisma.course.create({
    data: { ...dto, code: dto.code.toUpperCase() },
    include: { department: { select: { name: true, code: true } } },
  });
}

export async function updateCourse(id: string, dto: UpdateCourseDto) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw AppError.notFound("Course not found");

  if (dto.code) dto.code = dto.code.toUpperCase();
  return prisma.course.update({ where: { id }, data: dto });
}

export async function assignCourseToSemester(dto: AssignCourseToSemesterDto) {
  const [course, semester] = await Promise.all([
    prisma.course.findUnique({ where: { id: dto.courseId } }),
    prisma.semester.findUnique({ where: { id: dto.semesterId } }),
  ]);

  if (!course) throw AppError.notFound("Course not found");
  if (!semester) throw AppError.notFound("Semester not found");

  // Check not already assigned
  const existing = await prisma.course.findFirst({
    where: { id: dto.courseId, semesters: { some: { id: dto.semesterId } } },
  });
  if (existing) throw AppError.conflict("Course already assigned to this semester");

  return prisma.course.update({
    where: { id: dto.courseId },
    data: { semesters: { connect: { id: dto.semesterId } } },
  });
}

export async function removeCourseFromSemester(courseId: string, semesterId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw AppError.notFound("Course not found");

  return prisma.course.update({
    where: { id: courseId },
    data: { semesters: { disconnect: { id: semesterId } } },
  });
}

// ─────────────────────────────────────────────────────────────
//  SECTIONS
// ─────────────────────────────────────────────────────────────

export async function getSections(params: {
  semesterId?: string;
  courseId?: string;
  teacherId?: string;
}) {
  const { semesterId, courseId, teacherId } = params;

  return prisma.section.findMany({
    where: {
      ...(semesterId && { semesterId }),
      ...(courseId && { courseId }),
      ...(teacherId && { teachers: { some: { staffProfileId: teacherId } } }),
    },
    orderBy: [{ course: { code: "asc" } }, { name: "asc" }],
    include: {
      course: { select: { name: true, code: true, creditHours: true } },
      semester: { select: { semesterNumber: true, type: true, isActive: true } },
      teachers: {
        include: {
          staffProfile: {
            select: {
              firstName: true, lastName: true, designation: true,
              user: { select: { id: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
}

export async function getSectionById(id: string) {
  const section = await prisma.section.findUnique({
    where: { id },
    include: {
      course: { select: { name: true, code: true, creditHours: true } },
      semester: {
        include: { academicSession: { include: { program: { select: { name: true } } } } },
      },
      teachers: {
        include: {
          staffProfile: {
            select: {
              id: true, firstName: true, lastName: true, designation: true,
              user: { select: { id: true, username: true } },
            },
          },
        },
      },
      timetableSlots: { orderBy: { dayOfWeek: "asc" } },
      _count: { select: { enrollments: true, attendanceSessions: true } },
    },
  });
  if (!section) throw AppError.notFound("Section not found");
  return section;
}

export async function createSection(dto: CreateSectionDto) {
  const [course, semester] = await Promise.all([
    prisma.course.findUnique({ where: { id: dto.courseId } }),
    prisma.semester.findUnique({ where: { id: dto.semesterId } }),
  ]);
  if (!course) throw AppError.notFound("Course not found");
  if (!semester) throw AppError.notFound("Semester not found");

  const existing = await prisma.section.findUnique({
    where: { courseId_semesterId_name: { courseId: dto.courseId, semesterId: dto.semesterId, name: dto.name } },
  });
  if (existing) throw AppError.conflict(`Section "${dto.name}" already exists for this course and semester`);

  return prisma.section.create({
    data: { ...dto, capacity: dto.capacity ?? 40 },
    include: {
      course: { select: { name: true, code: true } },
      semester: { select: { semesterNumber: true, type: true } },
    },
  });
}

export async function updateSection(id: string, dto: UpdateSectionDto) {
  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) throw AppError.notFound("Section not found");
  return prisma.section.update({ where: { id }, data: dto });
}

export async function assignTeacher(sectionId: string, dto: AssignTeacherDto) {
  const [section, staffProfile] = await Promise.all([
    prisma.section.findUnique({ where: { id: sectionId } }),
    prisma.staffProfile.findUnique({
      where: { id: dto.staffProfileId },
      include: { user: { include: { role: true } } },
    }),
  ]);

  if (!section) throw AppError.notFound("Section not found");
  if (!staffProfile) throw AppError.notFound("Staff profile not found");

  const role = staffProfile.user.role.name;
  if (role !== "TEACHER" && role !== "HOD") {
    throw AppError.badRequest("Only teachers or HODs can be assigned to sections");
  }

  // If setting as primary, demote existing primary teacher
  if (dto.isPrimary) {
    await prisma.courseTeacher.updateMany({
      where: { sectionId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return prisma.courseTeacher.upsert({
    where: { sectionId_staffProfileId: { sectionId, staffProfileId: dto.staffProfileId } },
    update: { isPrimary: dto.isPrimary ?? true },
    create: { sectionId, staffProfileId: dto.staffProfileId, isPrimary: dto.isPrimary ?? true },
  });
}

export async function removeTeacher(sectionId: string, staffProfileId: string) {
  const assignment = await prisma.courseTeacher.findUnique({
    where: { sectionId_staffProfileId: { sectionId, staffProfileId } },
  });
  if (!assignment) throw AppError.notFound("Teacher not assigned to this section");

  await prisma.courseTeacher.delete({
    where: { sectionId_staffProfileId: { sectionId, staffProfileId } },
  });
}
