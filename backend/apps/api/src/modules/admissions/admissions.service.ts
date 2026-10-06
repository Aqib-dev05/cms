import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { generateApplicationNo, generateRegistrationNo, generateCollegeEmail } from "../../utils/reg-no";
import { env } from "../../config/env";

export interface SubmitApplicationDto {
  programId:    string;
  firstName:    string;
  lastName:     string;
  fatherName?:  string;
  email:        string;
  phone?:       string;
  cnic?:        string;
  gender?:      "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: Date;
  address?:     string;
}

export interface ReviewApplicationDto {
  status:   "SHORTLISTED" | "APPROVED" | "REJECTED" | "WAITLISTED";
  remarks?: string;
}

export async function getApplications(params: {
  page:      number;
  limit:     number;
  status?:   string;
  programId?: string;
  search?:   string;
}) {
  const { page, limit, status, programId, search } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(status    && { status: status as "SUBMITTED" }),
    ...(programId && { programId }),
    ...(search    && {
      OR: [
        { applicationNo: { contains: search, mode: "insensitive" as const } },
        { firstName:     { contains: search, mode: "insensitive" as const } },
        { lastName:      { contains: search, mode: "insensitive" as const } },
        { email:         { contains: search, mode: "insensitive" as const } },
        { cnic:          { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: "desc" },
      include: { program: { select: { name: true, code: true } } },
    }),
    prisma.application.count({ where }),
  ]);

  return { applications, total };
}

export async function getApplicationById(id: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      program:       { select: { name: true, code: true, department: { select: { name: true } } } },
      documents:     { include: { media: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      studentProfile: {
        select: { registrationNo: true, user: { select: { username: true, email: true } } },
      },
    },
  });
  if (!app) throw AppError.notFound("Application not found");
  return app;
}

export async function submitApplication(dto: SubmitApplicationDto) {
  const program = await prisma.program.findUnique({ where: { id: dto.programId } });
  if (!program) throw AppError.notFound("Program not found");

  // Check duplicate email per program
  const existing = await prisma.application.findFirst({
    where: { email: dto.email, programId: dto.programId, status: { not: "REJECTED" } },
  });
  if (existing) throw AppError.conflict("An application with this email already exists for this program");

  const applicationNo = await generateApplicationNo();

  const application = await prisma.application.create({
    data: {
      applicationNo,
      ...dto,
      status:      "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  await prisma.applicationStatusHistory.create({
    data: { applicationId: application.id, toStatus: "SUBMITTED", note: "Application submitted" },
  });

  return application;
}

export async function reviewApplication(id: string, dto: ReviewApplicationDto, reviewedById: string) {
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) throw AppError.notFound("Application not found");

  if (["APPROVED", "REJECTED", "ENROLLED"].includes(application.status)) {
    throw AppError.badRequest(`Application is already ${application.status.toLowerCase()}`);
  }

  await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: {
        status:      dto.status,
        reviewedById,
        reviewedAt:  new Date(),
        remarks:     dto.remarks,
      },
    }),
    prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        fromStatus:    application.status,
        toStatus:      dto.status,
        changedById:   reviewedById,
        note:          dto.remarks,
      },
    }),
  ]);

  return prisma.application.findUnique({ where: { id } });
}

export async function approveAndEnroll(id: string, reviewedById: string) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { program: true },
  });
  if (!application)               throw AppError.notFound("Application not found");
  if (application.status !== "APPROVED" && application.status !== "SHORTLISTED") {
    throw AppError.badRequest("Only approved or shortlisted applications can be enrolled");
  }
  if (application.studentProfileId) throw AppError.conflict("Student account already created");

  const program        = application.program;
  const registrationNo = await generateRegistrationNo(program.code);
  const collegeEmail   = env.COLLEGE_EMAIL_ENABLED
    ? generateCollegeEmail(application.firstName, application.lastName, env.COLLEGE_EMAIL_DOMAIN)
    : undefined;

  const tempPassword   = `${application.firstName.toLowerCase()}@${new Date().getFullYear()}`;
  const passwordHash   = await bcrypt.hash(tempPassword, 12);
  const username       = `${application.firstName.toLowerCase()}.${registrationNo.toLowerCase().replace(/-/g, "")}`;

  const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
  if (!studentRole) throw AppError.internal("Student role not found");

  const user = await prisma.user.create({
    data: {
      username,
      email:        application.email,
      collegeEmail,
      passwordHash,
      roleId:       studentRole.id,
      studentProfile: {
        create: {
          registrationNo,
          firstName:     application.firstName,
          lastName:      application.lastName,
          fatherName:    application.fatherName ?? undefined,
          gender:        application.gender     ?? undefined,
          dateOfBirth:   application.dateOfBirth ?? undefined,
          cnic:          application.cnic        ?? undefined,
          phone:         application.phone       ?? undefined,
          address:       application.address     ?? undefined,
          programId:     application.programId,
          enrollmentDate: new Date(),
          currentSemester: 1,
        },
      },
    },
    include: { studentProfile: true },
  });

  await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: {
        status:          "ENROLLED",
        studentProfileId: user.studentProfile!.id,
        reviewedById,
        reviewedAt:      new Date(),
      },
    }),
    prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        fromStatus:    application.status,
        toStatus:      "ENROLLED",
        changedById:   reviewedById,
        note:          "Student account created and enrolled",
      },
    }),
  ]);

  return {
    user: { id: user.id, username, email: application.email, collegeEmail },
    student: user.studentProfile,
    tempPassword,
    note: "Share the temporary password with the student. They must change it on first login.",
  };
}
