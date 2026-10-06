import { prisma } from "../../config/database";
import { emitToSection, SOCKET_EVENTS } from "../../lib/socket";
import { AppError } from "../../utils/app-error";

export interface CreateExamDto {
  title:        string;
  type:         "MIDTERM" | "FINAL" | "QUIZ" | "ASSIGNMENT" | "LAB" | "PROJECT" | "SESSIONAL";
  sectionId:    string;
  totalMarks:   number;
  passingMarks: number;
  date?:        Date;
  duration?:    number;
  instructions?: string;
}

export interface UpdateExamDto {
  title?:        string;
  type?:         "MIDTERM" | "FINAL" | "QUIZ" | "ASSIGNMENT" | "LAB" | "PROJECT" | "SESSIONAL";
  totalMarks?:   number;
  passingMarks?: number;
  date?:         Date;
  duration?:     number;
  instructions?: string;
}

export interface EnterResultDto {
  studentProfileId: string;
  marksObtained:    number;
  isAbsent?:        boolean;
  remarks?:         string;
}

export interface BulkEnterResultsDto {
  results: EnterResultDto[];
}

// ─────────────────────────────────────────────────────────────
//  EXAMS
// ─────────────────────────────────────────────────────────────

export async function getExams(params: {
  sectionId?:  string;
  semesterId?: string;
  type?:       string;
}) {
  return prisma.exam.findMany({
    where: {
      ...(params.sectionId  && { sectionId: params.sectionId }),
      ...(params.semesterId && { section: { semesterId: params.semesterId } }),
      ...(params.type       && { type: params.type as "MIDTERM" }),
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      section: {
        include: {
          course:   { select: { name: true, code: true } },
          semester: { select: { semesterNumber: true, type: true } },
        },
      },
      _count: { select: { results: true } },
    },
  });
}

export async function getExamById(id: string) {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      section: {
        include: {
          course:   { select: { name: true, code: true } },
          semester: { select: { semesterNumber: true, type: true } },
          teachers: {
            where: { isPrimary: true },
            include: { staffProfile: { select: { firstName: true, lastName: true } } },
          },
        },
      },
      results: {
        include: {
          studentProfile: {
            select: { registrationNo: true, firstName: true, lastName: true },
          },
        },
        orderBy: { studentProfile: { registrationNo: "asc" } },
      },
    },
  });
  if (!exam) throw AppError.notFound("Exam not found");
  return exam;
}

export async function createExam(dto: CreateExamDto) {
  const section = await prisma.section.findUnique({ where: { id: dto.sectionId } });
  if (!section) throw AppError.notFound("Section not found");

  if (dto.passingMarks > dto.totalMarks) {
    throw AppError.badRequest("Passing marks cannot exceed total marks");
  }

  return prisma.exam.create({
    data: dto,
    include: {
      section: { include: { course: { select: { name: true, code: true } } } },
    },
  });
}

export async function updateExam(id: string, dto: UpdateExamDto) {
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) throw AppError.notFound("Exam not found");

  if (exam.isPublished) {
    throw AppError.badRequest("Cannot edit a published exam. Unpublish it first.");
  }

  if (dto.passingMarks && dto.totalMarks && dto.passingMarks > dto.totalMarks) {
    throw AppError.badRequest("Passing marks cannot exceed total marks");
  }

  return prisma.exam.update({ where: { id }, data: dto });
}

export async function deleteExam(id: string) {
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) throw AppError.notFound("Exam not found");
  if (exam.isPublished) throw AppError.badRequest("Cannot delete a published exam");

  await prisma.exam.delete({ where: { id } });
}

export async function publishExam(id: string) {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { _count: { select: { results: true } } },
  });
  if (!exam) throw AppError.notFound("Exam not found");
  if (exam._count.results === 0) {
    throw AppError.badRequest("Cannot publish an exam with no results entered");
  }

  return prisma.exam.update({ where: { id }, data: { isPublished: true } });
}

export async function unpublishExam(id: string) {
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) throw AppError.notFound("Exam not found");
  return prisma.exam.update({ where: { id }, data: { isPublished: false } });
}

// ─────────────────────────────────────────────────────────────
//  RESULTS
// ─────────────────────────────────────────────────────────────

export async function enterResult(examId: string, dto: EnterResultDto) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw AppError.notFound("Exam not found");
  if (exam.isPublished) throw AppError.badRequest("Cannot edit results of a published exam");

  // Validate student is enrolled in the section
  const profile = await prisma.studentProfile.findUnique({
    where: { id: dto.studentProfileId },
  });
  if (!profile) throw AppError.notFound("Student not found");

  const enrolled = await prisma.enrollment.findUnique({
    where: {
      studentProfileId_sectionId: {
        studentProfileId: dto.studentProfileId,
        sectionId: exam.sectionId,
      },
    },
  });
  if (!enrolled) throw AppError.badRequest("Student is not enrolled in this section");

  if (!dto.isAbsent && dto.marksObtained > exam.totalMarks) {
    throw AppError.badRequest(`Marks cannot exceed total marks (${exam.totalMarks})`);
  }

  return prisma.examResult.upsert({
    where: {
      examId_studentProfileId: {
        examId,
        studentProfileId: dto.studentProfileId,
      },
    },
    update: {
      marksObtained: dto.isAbsent ? 0 : dto.marksObtained,
      isAbsent:      dto.isAbsent ?? false,
      remarks:       dto.remarks,
    },
    create: {
      examId,
      studentProfileId: dto.studentProfileId,
      marksObtained:    dto.isAbsent ? 0 : dto.marksObtained,
      isAbsent:         dto.isAbsent ?? false,
      remarks:          dto.remarks,
    },
    include: {
      studentProfile: { select: { registrationNo: true, firstName: true, lastName: true } },
    },
  });
}

export async function bulkEnterResults(examId: string, dto: BulkEnterResultsDto) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw AppError.notFound("Exam not found");
  if (exam.isPublished) throw AppError.badRequest("Cannot edit results of a published exam");

  // Validate all marks before saving any
  for (const r of dto.results) {
    if (!r.isAbsent && r.marksObtained > exam.totalMarks) {
      throw AppError.badRequest(
        `Marks for student ${r.studentProfileId} exceed total marks (${exam.totalMarks})`
      );
    }
  }

  const saved = await Promise.all(dto.results.map((r) => enterResult(examId, r)));
  return { count: saved.length, results: saved };
}

export async function publishResults(examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw AppError.notFound("Exam not found");

  await prisma.examResult.updateMany({
    where: { examId },
    data:  { isPublished: true },
  });

  const updated = await prisma.exam.update({ where: { id: examId }, data: { isPublished: true } });

  // Notify enrolled students in the section
  emitToSection(updated.sectionId, SOCKET_EVENTS.RESULT_PUBLISHED, {
    examId:  examId,
    message: "Exam results have been published",
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────
//  STUDENT GRADE REPORT
// ─────────────────────────────────────────────────────────────

export async function getStudentGradeReport(userId: string, semesterId?: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Student not found");

  const results = await prisma.examResult.findMany({
    where: {
      studentProfileId: profile.id,
      isPublished:      true,
      ...(semesterId && { exam: { section: { semesterId } } }),
    },
    include: {
      exam: {
        include: {
          section: {
            include: { course: { select: { name: true, code: true, creditHours: true } } },
          },
        },
      },
    },
    orderBy: { exam: { date: "asc" } },
  });

  // Group by course
  const byCourse = new Map<string, {
    course: { name: string; code: string; creditHours: number };
    exams:  typeof results;
    totalWeighted: number;
    totalPossible: number;
  }>();

  for (const result of results) {
    const key = result.exam.section.course.code;
    if (!byCourse.has(key)) {
      byCourse.set(key, {
        course:        result.exam.section.course,
        exams:         [],
        totalWeighted: 0,
        totalPossible: 0,
      });
    }
    const entry = byCourse.get(key)!;
    entry.exams.push(result);
    if (!result.isAbsent) {
      entry.totalWeighted += result.marksObtained;
      entry.totalPossible += result.exam.totalMarks;
    }
  }

  const courseReports = Array.from(byCourse.values()).map((entry) => {
    const percentage = entry.totalPossible > 0
      ? Math.round((entry.totalWeighted / entry.totalPossible) * 100)
      : 0;

    return {
      course:       entry.course,
      exams:        entry.exams,
      percentage,
      grade:        getLetterGrade(percentage),
      isPassing:    percentage >= 50,
    };
  });

  const overallPercentage = courseReports.length > 0
    ? Math.round(courseReports.reduce((s, r) => s + r.percentage, 0) / courseReports.length)
    : 0;

  return { courses: courseReports, overallPercentage, overallGrade: getLetterGrade(overallPercentage) };
}

function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 85) return "A";
  if (percentage >= 80) return "A-";
  if (percentage >= 75) return "B+";
  if (percentage >= 70) return "B";
  if (percentage >= 65) return "B-";
  if (percentage >= 60) return "C+";
  if (percentage >= 55) return "C";
  if (percentage >= 50) return "C-";
  if (percentage >= 45) return "D";
  return "F";
}

// ─────────────────────────────────────────────────────────────
//  SECTION RESULT SUMMARY (for teacher/HOD)
// ─────────────────────────────────────────────────────────────

export async function getSectionResultSummary(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { results: true },
  });
  if (!exam) throw AppError.notFound("Exam not found");

  const results = exam.results.filter((r: { isAbsent: boolean }) => !r.isAbsent);
  const total   = results.length;
  if (total === 0) return { exam, stats: null };

  const marks    = results.map((r: { marksObtained: number }) => r.marksObtained);
  const passing  = results.filter((r: { marksObtained: number }) => r.marksObtained >= exam.passingMarks).length;
  const highest  = Math.max(...marks);
  const lowest   = Math.min(...marks);
  const average  = Math.round(marks.reduce((a: number, b: number) => a + b, 0) / total);

  return {
    exam,
    stats: {
      total,
      absent:       exam.results.filter((r: { isAbsent: boolean }) => r.isAbsent).length,
      passing,
      failing:      total - passing,
      passRate:     Math.round((passing / total) * 100),
      highest,
      lowest,
      average,
    },
  };
}
