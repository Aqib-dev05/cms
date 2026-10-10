import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemoData } from "./seed-demo";

const prisma = new PrismaClient();

// ─── Roles ────────────────────────────────────────────────────

const ROLES: { name: RoleName; displayName: string; description: string }[] = [
  { name: "ADMIN",             displayName: "Administrator",        description: "Full system access" },
  { name: "HOD",               displayName: "Head of Department",   description: "Department management + teaching" },
  { name: "TEACHER",           displayName: "Teacher / Faculty",    description: "Course teaching and grading" },
  { name: "HEAD_CLERK",        displayName: "Head Clerk",           description: "Finance head, manages clerks" },
  { name: "CLERK",             displayName: "Clerk",                description: "Fee collection and invoicing" },
  { name: "COMPLAINT_OFFICER", displayName: "Complaint Officer",    description: "Central grievance monitoring" },
  { name: "LIBRARIAN",         displayName: "Librarian",            description: "Library management" },
  { name: "STUDENT",           displayName: "Student",              description: "Student portal access" },
];

// ─── Permissions ──────────────────────────────────────────────

const PERMISSIONS = [
  // User
  { code: "user.read",    module: "user",    action: "read"   },
  { code: "user.create",  module: "user",    action: "create" },
  { code: "user.update",  module: "user",    action: "update" },
  { code: "user.delete",  module: "user",    action: "delete" },
  { code: "user.manage",  module: "user",    action: "manage" },
  // Academic
  { code: "department.read",   module: "academic", action: "read"   },
  { code: "department.manage", module: "academic", action: "manage" },
  { code: "program.read",      module: "academic", action: "read"   },
  { code: "program.manage",    module: "academic", action: "manage" },
  { code: "course.read",       module: "academic", action: "read"   },
  { code: "course.manage",     module: "academic", action: "manage" },
  { code: "section.read",      module: "academic", action: "read"   },
  { code: "section.manage",    module: "academic", action: "manage" },
  { code: "timetable.read",    module: "timetable",action: "read"   },
  { code: "timetable.manage",  module: "timetable",action: "manage" },
  // Students
  { code: "student.read",   module: "students", action: "read"   },
  { code: "student.create", module: "students", action: "create" },
  { code: "student.update", module: "students", action: "update" },
  { code: "student.delete", module: "students", action: "delete" },
  { code: "student.manage", module: "students", action: "manage" },
  // Staff
  { code: "staff.read",   module: "staff", action: "read"   },
  { code: "staff.create", module: "staff", action: "create" },
  { code: "staff.update", module: "staff", action: "update" },
  { code: "staff.manage", module: "staff", action: "manage" },
  // Attendance
  { code: "attendance.read",   module: "attendance", action: "read"   },
  { code: "attendance.create", module: "attendance", action: "create" },
  { code: "attendance.update", module: "attendance", action: "update" },
  { code: "attendance.manage", module: "attendance", action: "manage" },
  // Exams
  { code: "exam.read",    module: "exams", action: "read"   },
  { code: "exam.create",  module: "exams", action: "create" },
  { code: "exam.manage",  module: "exams", action: "manage" },
  { code: "grade.read",   module: "exams", action: "read"   },
  { code: "grade.create", module: "exams", action: "create" },
  { code: "grade.update", module: "exams", action: "update" },
  { code: "grade.manage", module: "exams", action: "manage" },
  // Finance
  { code: "fee.read",       module: "finance", action: "read"   },
  { code: "fee.create",     module: "finance", action: "create" },
  { code: "fee.update",     module: "finance", action: "update" },
  { code: "fee.manage",     module: "finance", action: "manage" },
  { code: "payment.read",   module: "finance", action: "read"   },
  { code: "payment.create", module: "finance", action: "create" },
  { code: "payment.manage", module: "finance", action: "manage" },
  { code: "clerk.manage",   module: "finance", action: "manage" },
  // Library
  { code: "library.read",   module: "library", action: "read"   },
  { code: "library.issue",  module: "library", action: "create" },
  { code: "library.return", module: "library", action: "update" },
  { code: "library.manage", module: "library", action: "manage" },
  // Complaints
  { code: "complaint.create",  module: "complaints", action: "create" },
  { code: "complaint.read",    module: "complaints", action: "read"   },
  { code: "complaint.assign",  module: "complaints", action: "update" },
  { code: "complaint.resolve", module: "complaints", action: "update" },
  { code: "complaint.close",   module: "complaints", action: "update" },
  { code: "complaint.manage",  module: "complaints", action: "manage" },
  // Notices
  { code: "notice.read",   module: "notices", action: "read"   },
  { code: "notice.create", module: "notices", action: "create" },
  { code: "notice.manage", module: "notices", action: "manage" },
  // Admissions
  { code: "admission.read",    module: "admissions", action: "read"   },
  { code: "admission.create",  module: "admissions", action: "create" },
  { code: "admission.update",  module: "admissions", action: "update" },
  { code: "admission.approve", module: "admissions", action: "update" },
  { code: "admission.manage",  module: "admissions", action: "manage" },
  // Notifications
  { code: "notification.read",   module: "notifications", action: "read"   },
  { code: "notification.manage", module: "notifications", action: "manage" },
  // Audit
  { code: "audit.read",   module: "audit", action: "read"   },
  { code: "audit.manage", module: "audit", action: "manage" },
  { code: "analytics.read", module: "analytics", action: "read" },
];

// ─── Role → Permission map ────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.code), // all permissions

  HOD: [
    "department.read", "program.read",
    "course.read", "course.manage",
    "section.read", "section.manage",
    "timetable.read", "timetable.manage",
    "student.read", "staff.read", "staff.create", "staff.update",
    "attendance.read", "attendance.create", "attendance.update", "attendance.manage",
    "exam.read", "exam.create", "exam.manage",
    "grade.read", "grade.create", "grade.update", "grade.manage",
    "complaint.read", "complaint.assign", "complaint.resolve",
    "notice.read", "notice.create",
    "notification.read", "admission.read",
  ],

  TEACHER: [
    "department.read", "course.read", "section.read",
    "timetable.read", "student.read",
    "attendance.read", "attendance.create", "attendance.update",
    "grade.read", "grade.create", "grade.update", "exam.read",
    "complaint.create", "notice.read",
    "notification.read", "library.read",
  ],

  HEAD_CLERK: [
    "student.read", "staff.read",
    "fee.read", "fee.create", "fee.update", "fee.manage",
    "payment.read", "payment.create", "payment.manage", "clerk.manage",
    "admission.read", "admission.approve",
    "complaint.read", "complaint.assign", "complaint.resolve",
    "notice.read", "notification.read", "audit.read",
  ],

  CLERK: [
    "student.read",
    "fee.read", "fee.create", "fee.update",
    "payment.read", "payment.create",
    "admission.read", "admission.create",
    "notice.read", "notification.read",
  ],

  COMPLAINT_OFFICER: [
    "student.read", "staff.read",
    "complaint.read", "complaint.assign",
    "complaint.resolve", "complaint.close", "complaint.manage",
    "notice.read", "notification.read",
  ],

  LIBRARIAN: [
    "student.read", "staff.read",
    "library.read", "library.issue", "library.return", "library.manage",
    "complaint.create", "complaint.read",
    "notice.read", "notification.read",
  ],

  STUDENT: [
    "course.read", "timetable.read",
    "attendance.read", "grade.read", "exam.read",
    "fee.read", "payment.read",
    "library.read",
    "complaint.create", "complaint.read",
    "notice.read", "notification.read",
  ],
};

// ─── Seed function ────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  // 1. Seed roles
  console.log("📋 Seeding roles...");
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
  }

  // 2. Seed permissions
  console.log("🔐 Seeding permissions...");
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, action: perm.action },
      create: perm,
    });
  }

  // 3. Assign permissions to roles
  console.log("🔗 Assigning role permissions...");
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName as RoleName } });
    if (!role) continue;

    for (const code of permCodes) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // 4. Seed default admin user
  console.log("👤 Seeding default admin user...");
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (!adminRole) throw new Error("Admin role not found");

  const adminExists = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash("Admin@1234", 12);

    await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@college.edu.pk",
        passwordHash,
        roleId: adminRole.id,
        staffProfile: {
          create: {
            employeeId: "EMP-0001",
            firstName: "System",
            lastName: "Administrator",
            joiningDate: new Date(),
          },
        },
      },
    });
    console.log("   ✅ Admin user created (username: admin, password: Admin@1234)");
    console.log("   ⚠️  CHANGE THE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!");
  } else {
    console.log("   ℹ️  Admin user already exists — skipping.");
  }

  // 5. Seed complaint categories
  console.log("📂 Seeding complaint categories...");
  const categories = [
    { name: "Fee Complaint",      routeToRole: "HEAD_CLERK",        description: "Issues related to fee payment, invoices, receipts" },
    { name: "Academic Complaint", routeToRole: "HOD",               description: "Issues related to courses, grades, attendance" },
    { name: "Library Complaint",  routeToRole: "LIBRARIAN",         description: "Issues related to library books or services" },
    { name: "General Complaint",  routeToRole: "ADMIN",             description: "General complaints not covered by other categories" },
  ];

  for (const cat of categories) {
    await prisma.complaintCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        description: cat.description,
        routeToRole: cat.routeToRole as RoleName,
      },
    });
  }

  // 6. Seed fee types
  console.log("💰 Seeding fee types...");
  const feeTypes = [
    "Tuition Fee", "Exam Fee", "Library Fee",
    "Sports Fee", "Lab Fee", "Registration Fee",
    "Security Deposit",
  ];

  for (const name of feeTypes) {
    await prisma.feeType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 7. Demo data (students, teachers, timetable, attendance, fees, library, ...)
  //    Skipped in production unless SEED_DEMO=true; disable anywhere with SEED_DEMO=false.
  const demoFlag = process.env.SEED_DEMO;
  const runDemo = demoFlag ? demoFlag === "true" : process.env.NODE_ENV !== "production";
  if (runDemo) {
    await seedDemoData(prisma);
  } else {
    console.log("\n⏭️  Demo data skipped (set SEED_DEMO=true to include it).");
  }

  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
