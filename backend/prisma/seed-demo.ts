/**
 * Demo data for the whole system — every module gets realistic rows so each
 * screen of every role has something to show.
 *
 *   npm run db:seed                 → base data (roles, permissions, admin) + demo data
 *   SEED_DEMO=false npm run db:seed → base data only
 *
 * Everything is generated relative to "today" (semester started ~5 weeks ago), so the
 * attendance trend, overdue invoices, library fines and the teacher's 7-day edit window
 * all look right whenever you seed. A fixed PRNG seed keeps the data deterministic.
 *
 * All demo accounts use the password in DEMO_PASSWORD.
 */
import {
  type PrismaClient,
  type RoleName,
  type Gender,
  type StudentStatus,
  type AttendanceStatus,
  type FeeStatus,
  type PaymentMethod,
  type BookStatus,
  type NoticeAudience,
  type ComplaintStatus,
  type ApplicationStatus,
  type ExamType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

export const DEMO_PASSWORD = "Demo@1234";

// ─── helpers ──────────────────────────────────────────────────

const DAY = 86_400_000;
const todayUtc = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
})();
const YEAR = todayUtc.getUTCFullYear();

/** Date-only (UTC midnight) offset from today. */
const dayOffset = (n: number) => new Date(todayUtc.getTime() + n * DAY);
/** A moment during the (Pakistan) working day, n days from today. */
const atHour = (n: number, hourUtc: number, minute = 0) =>
  new Date(todayUtc.getTime() + n * DAY + hourUtc * 3_600_000 + minute * 60_000);

/** Small deterministic PRNG so every seed run produces the same data. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261010);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pad = (n: number, len: number) => String(n).padStart(len, "0");

let idCounter = 0;
const cnic = () => {
  idCounter += 1;
  return `35202-${String(1_000_000 + idCounter * 7919).slice(-7)}-${(idCounter % 9) + 1}`;
};
const phone = () => `0300-${String(1_000_000 + idCounter * 313).slice(-7)}`;

const emailDomain = process.env.COLLEGE_EMAIL_DOMAIN ?? "gct.edu.pk";
const collegeEmailEnabled = process.env.COLLEGE_EMAIL_ENABLED === "true";
const cleanName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ─── static demo content ──────────────────────────────────────

interface StaffSpec {
  username: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  role: RoleName;
  dept?: "CS" | "BA";
  designation: string;
  qualification: string;
}

const STAFF: StaffSpec[] = [
  { username: "hod.cs",         firstName: "Imran",  lastName: "Shahid",   gender: "MALE",   role: "HOD",               dept: "CS", designation: "Head of Department / Associate Professor", qualification: "PhD Computer Science" },
  { username: "hod.ba",         firstName: "Nadia",  lastName: "Rauf",     gender: "FEMALE", role: "HOD",               dept: "BA", designation: "Head of Department / Associate Professor", qualification: "PhD Management Sciences" },
  { username: "teacher.ayesha", firstName: "Ayesha", lastName: "Khan",     gender: "FEMALE", role: "TEACHER",           dept: "CS", designation: "Lecturer",            qualification: "MS Computer Science" },
  { username: "teacher.usman",  firstName: "Usman",  lastName: "Tariq",    gender: "MALE",   role: "TEACHER",           dept: "CS", designation: "Assistant Professor", qualification: "PhD Mathematics" },
  { username: "teacher.sana",   firstName: "Sana",   lastName: "Malik",    gender: "FEMALE", role: "TEACHER",           dept: "CS", designation: "Lecturer",            qualification: "MA English Literature" },
  { username: "teacher.bilal",  firstName: "Bilal",  lastName: "Ahmed",    gender: "MALE",   role: "TEACHER",           dept: "CS", designation: "Lecturer",            qualification: "MS Software Engineering" },
  { username: "teacher.hamza",  firstName: "Hamza",  lastName: "Iqbal",    gender: "MALE",   role: "TEACHER",           dept: "BA", designation: "Lecturer",            qualification: "MBA Finance" },
  { username: "teacher.maryam", firstName: "Maryam", lastName: "Siddiqui", gender: "FEMALE", role: "TEACHER",           dept: "BA", designation: "Lecturer",            qualification: "MBA Marketing" },
  { username: "headclerk",      firstName: "Tariq",  lastName: "Mehmood",  gender: "MALE",   role: "HEAD_CLERK",                  designation: "Head Clerk",          qualification: "M.Com" },
  { username: "clerk.kamran",   firstName: "Kamran", lastName: "Aslam",    gender: "MALE",   role: "CLERK",                       designation: "Accounts Clerk",      qualification: "B.Com" },
  { username: "clerk.hina",     firstName: "Hina",   lastName: "Javed",    gender: "FEMALE", role: "CLERK",                       designation: "Fee Clerk",           qualification: "B.Com" },
  { username: "complaints",     firstName: "Rabia",  lastName: "Anwar",    gender: "FEMALE", role: "COMPLAINT_OFFICER",           designation: "Complaint Officer",   qualification: "MA Public Administration" },
  { username: "librarian",      firstName: "Zubair", lastName: "Hussain",  gender: "MALE",   role: "LIBRARIAN",                   designation: "Librarian",           qualification: "MLIS" },
];

type Profile = "good" | "avg" | "poor";
type ProgramCode = "CS" | "IT" | "BBA";

interface StudentSpec {
  firstName: string;
  lastName: string;
  gender: Gender;
  program: ProgramCode;
  semester: number;
  att: Profile;
  status?: StudentStatus;
  /** admission year offset from the current year (0 = this year) */
  admitOffset?: number;
}

const STUDENTS: StudentSpec[] = [
  // BS Computer Science — semester 1 (this year's intake)
  { firstName: "Ali",     lastName: "Raza",     gender: "MALE",   program: "CS", semester: 1, att: "good" },
  { firstName: "Fatima",  lastName: "Noor",     gender: "FEMALE", program: "CS", semester: 1, att: "good" },
  { firstName: "Hassan",  lastName: "Mahmood",  gender: "MALE",   program: "CS", semester: 1, att: "avg"  },
  { firstName: "Zainab",  lastName: "Akhtar",   gender: "FEMALE", program: "CS", semester: 1, att: "good" },
  { firstName: "Omar",    lastName: "Farooq",   gender: "MALE",   program: "CS", semester: 1, att: "poor" },
  { firstName: "Hira",    lastName: "Aslam",    gender: "FEMALE", program: "CS", semester: 1, att: "avg"  },
  // BS Computer Science — semester 3 (last year's intake)
  { firstName: "Ahmed",   lastName: "Bashir",   gender: "MALE",   program: "CS", semester: 3, att: "good", admitOffset: -1 },
  { firstName: "Sadia",   lastName: "Perveen",  gender: "FEMALE", program: "CS", semester: 3, att: "good", admitOffset: -1 },
  { firstName: "Talha",   lastName: "Mehmood",  gender: "MALE",   program: "CS", semester: 3, att: "avg",  admitOffset: -1 },
  { firstName: "Mahnoor", lastName: "Ali",      gender: "FEMALE", program: "CS", semester: 3, att: "good", admitOffset: -1 },
  { firstName: "Daniyal", lastName: "Khan",     gender: "MALE",   program: "CS", semester: 3, att: "poor", admitOffset: -1 },
  // BS Information Technology — semester 1
  { firstName: "Rehan",   lastName: "Yousaf",   gender: "MALE",   program: "IT", semester: 1, att: "good" },
  { firstName: "Iqra",    lastName: "Shafique", gender: "FEMALE", program: "IT", semester: 1, att: "avg"  },
  { firstName: "Waqas",   lastName: "Ahmad",    gender: "MALE",   program: "IT", semester: 1, att: "good" },
  { firstName: "Laiba",   lastName: "Sheikh",   gender: "FEMALE", program: "IT", semester: 1, att: "good" },
  // BBA — semester 1
  { firstName: "Saad",    lastName: "Chaudhry", gender: "MALE",   program: "BBA", semester: 1, att: "good" },
  { firstName: "Anum",    lastName: "Fatima",   gender: "FEMALE", program: "BBA", semester: 1, att: "good" },
  { firstName: "Faizan",  lastName: "Rasheed",  gender: "MALE",   program: "BBA", semester: 1, att: "avg"  },
  { firstName: "Komal",   lastName: "Riaz",     gender: "FEMALE", program: "BBA", semester: 1, att: "good" },
  { firstName: "Junaid",  lastName: "Alam",     gender: "MALE",   program: "BBA", semester: 1, att: "poor" },
  // BBA — semester 3
  { firstName: "Zara",    lastName: "Hussain",  gender: "FEMALE", program: "BBA", semester: 3, att: "good", admitOffset: -1 },
  { firstName: "Adeel",   lastName: "Anwar",    gender: "MALE",   program: "BBA", semester: 3, att: "avg",  admitOffset: -1 },
  { firstName: "Nimra",   lastName: "Tariq",    gender: "FEMALE", program: "BBA", semester: 3, att: "good", admitOffset: -1 },
  { firstName: "Haris",   lastName: "Javed",    gender: "MALE",   program: "BBA", semester: 3, att: "good", admitOffset: -1 },
  // Not enrolled this semester (shows other statuses in the student list)
  { firstName: "Kashif",  lastName: "Nawaz",    gender: "MALE",   program: "CS", semester: 5, att: "avg", status: "SUSPENDED", admitOffset: -2 },
  { firstName: "Sidra",   lastName: "Munir",    gender: "FEMALE", program: "CS", semester: 8, att: "good", status: "ALUMNI",   admitOffset: -5 },
];

const COURSES: Record<"CS" | "BA", { code: string; name: string; credit: number; sem: number; elective?: boolean }[]> = {
  CS: [
    { code: "CS101", name: "Programming Fundamentals",       credit: 3, sem: 1 },
    { code: "CS102", name: "Introduction to ICT",            credit: 3, sem: 1 },
    { code: "MT101", name: "Calculus and Analytical Geometry", credit: 3, sem: 1 },
    { code: "EN101", name: "English Composition",            credit: 3, sem: 1 },
    { code: "CS201", name: "Data Structures and Algorithms", credit: 3, sem: 3 },
    { code: "CS202", name: "Object Oriented Programming",    credit: 3, sem: 3 },
    { code: "CS203", name: "Discrete Mathematics",           credit: 3, sem: 3 },
    { code: "CS204", name: "Database Systems",               credit: 3, sem: 3 },
    { code: "CS290", name: "Introduction to Cyber Security", credit: 2, sem: 0, elective: true },
  ],
  BA: [
    { code: "BA101", name: "Principles of Management", credit: 3, sem: 1 },
    { code: "BA102", name: "Financial Accounting",     credit: 3, sem: 1 },
    { code: "BA103", name: "Business Communication",   credit: 3, sem: 1 },
    { code: "BA201", name: "Marketing Management",     credit: 3, sem: 3 },
    { code: "BA202", name: "Business Statistics",      credit: 3, sem: 3 },
    { code: "BA203", name: "Organizational Behavior",  credit: 3, sem: 3 },
  ],
};

/** Which teacher takes which course in which program (course code → teacher username). */
const TEACHING: Record<ProgramCode, Record<number, Record<string, string>>> = {
  CS:  { 1: { CS101: "teacher.ayesha", CS102: "teacher.bilal", MT101: "teacher.usman", EN101: "teacher.sana" },
         3: { CS201: "hod.cs", CS202: "teacher.ayesha", CS203: "teacher.usman", CS204: "teacher.bilal" } },
  IT:  { 1: { CS101: "teacher.ayesha", CS102: "teacher.bilal", MT101: "teacher.usman", EN101: "teacher.sana" } },
  BBA: { 1: { BA101: "hod.ba", BA102: "teacher.hamza", BA103: "teacher.maryam" },
         3: { BA201: "teacher.maryam", BA202: "teacher.hamza", BA203: "hod.ba" } },
};

const PROGRAMS: { code: ProgramCode; name: string; dept: "CS" | "BA"; fees: [string, number, boolean][] }[] = [
  { code: "CS",  name: "BS Computer Science",           dept: "CS",
    fees: [["Tuition Fee", 48000, true], ["Exam Fee", 4000, true], ["Library Fee", 2000, true], ["Lab Fee", 6000, true], ["Sports Fee", 1000, false], ["Registration Fee", 5000, false]] },
  { code: "IT",  name: "BS Information Technology",     dept: "CS",
    fees: [["Tuition Fee", 48000, true], ["Exam Fee", 4000, true], ["Library Fee", 2000, true], ["Lab Fee", 6000, true], ["Sports Fee", 1000, false], ["Registration Fee", 5000, false]] },
  { code: "BBA", name: "Bachelor of Business Administration", dept: "BA",
    fees: [["Tuition Fee", 42000, true], ["Exam Fee", 4000, true], ["Library Fee", 2000, true], ["Sports Fee", 1000, false], ["Registration Fee", 5000, false]] },
];

const BOOKS: { title: string; author: string; isbn?: string; publisher: string; edition?: string; year?: number; category: string; copies: number; shelf: string }[] = [
  { title: "Clean Code",                              author: "Robert C. Martin",                              isbn: "9780132350884", publisher: "Prentice Hall",   year: 2008, category: "Programming",      copies: 3, shelf: "CS-1" },
  { title: "Introduction to Algorithms",              author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein", isbn: "9780262033848", publisher: "MIT Press", edition: "3rd", year: 2009, category: "Computer Science", copies: 3, shelf: "CS-1" },
  { title: "The C Programming Language",              author: "Brian W. Kernighan, Dennis M. Ritchie",         isbn: "9780131103627", publisher: "Prentice Hall",   edition: "2nd", year: 1988, category: "Programming",      copies: 2, shelf: "CS-2" },
  { title: "Design Patterns",                         author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides", isbn: "9780201633610", publisher: "Addison-Wesley", year: 1994, category: "Programming", copies: 2, shelf: "CS-2" },
  { title: "Database System Concepts",                author: "Abraham Silberschatz, Henry F. Korth, S. Sudarshan", publisher: "McGraw-Hill", edition: "7th",  year: 2019, category: "Computer Science", copies: 3, shelf: "CS-3" },
  { title: "Operating System Concepts",               author: "Abraham Silberschatz, Peter B. Galvin, Greg Gagne",  publisher: "Wiley",       edition: "10th", year: 2018, category: "Computer Science", copies: 2, shelf: "CS-3" },
  { title: "Computer Networking: A Top-Down Approach", author: "James F. Kurose, Keith W. Ross",               publisher: "Pearson",         edition: "7th",  year: 2016, category: "Computer Science", copies: 3, shelf: "CS-4" },
  { title: "Discrete Mathematics and Its Applications", author: "Kenneth H. Rosen",                            publisher: "McGraw-Hill",     edition: "8th",  year: 2018, category: "Mathematics",      copies: 2, shelf: "MT-1" },
  { title: "Calculus: Early Transcendentals",         author: "James Stewart",                                 publisher: "Cengage",         edition: "8th",  year: 2015, category: "Mathematics",      copies: 3, shelf: "MT-1" },
  { title: "Management",                              author: "Stephen P. Robbins, Mary Coulter",              publisher: "Pearson",         edition: "14th", year: 2017, category: "Business",         copies: 3, shelf: "BA-1" },
  { title: "Marketing Management",                    author: "Philip Kotler, Kevin Lane Keller",              publisher: "Pearson",         edition: "15th", year: 2015, category: "Business",         copies: 2, shelf: "BA-1" },
  { title: "Financial Accounting",                    author: "Jerry J. Weygandt, Paul D. Kimmel, Donald E. Kieso", publisher: "Wiley",      edition: "10th", year: 2015, category: "Business",         copies: 2, shelf: "BA-2" },
  { title: "Statistics for Business and Economics",   author: "David R. Anderson, Dennis J. Sweeney, Thomas A. Williams", publisher: "Cengage", edition: "13th", year: 2017, category: "Business",       copies: 2, shelf: "BA-2" },
  { title: "Organizational Behavior",                 author: "Stephen P. Robbins, Timothy A. Judge",          publisher: "Pearson",         edition: "16th", year: 2015, category: "Business",         copies: 2, shelf: "BA-3" },
  { title: "English Grammar in Use",                  author: "Raymond Murphy",                                publisher: "Cambridge University Press", edition: "4th", year: 2012, category: "Language",  copies: 3, shelf: "EN-1" },
  { title: "Pride and Prejudice",                     author: "Jane Austen",                                   publisher: "Penguin Classics",                                  category: "Literature",       copies: 2, shelf: "EN-2" },
];

// ─── main ─────────────────────────────────────────────────────

export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  console.log("\n🎓 Seeding demo data...");

  if (await prisma.department.findUnique({ where: { code: "CS" } })) {
    console.log("   ℹ️  Department 'CS' already exists — demo data skipped (use `npm run db:reset` for a clean slate).");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const roles = new Map((await prisma.role.findMany()).map((r) => [r.name, r.id]));
  const roleId = (name: RoleName) => {
    const id = roles.get(name);
    if (!id) throw new Error(`Role ${name} missing — run the base seed first`);
    return id;
  };
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!admin) throw new Error("Admin user missing — run the base seed first");

  // ── 1. Departments ─────────────────────────────────────────
  const deptCS = await prisma.department.create({ data: { name: "Computer Science", code: "CS", description: "Computing, software and information technology programs" } });
  const deptBA = await prisma.department.create({ data: { name: "Business Administration", code: "BA", description: "Management, accounting and marketing programs" } });
  const deptId = { CS: deptCS.id, BA: deptBA.id };

  // ── 2. Staff accounts ──────────────────────────────────────
  console.log("   👩‍🏫 Staff...");
  let empSeq = await prisma.staffProfile.count({ where: { employeeId: { startsWith: `EMP-${YEAR}` } } });
  const staff = new Map<string, { userId: string; staffId: string; role: RoleName }>();
  for (const s of STAFF) {
    empSeq += 1;
    const user = await prisma.user.create({
      data: {
        username: s.username,
        email: `${s.username}@example.com`,
        collegeEmail: collegeEmailEnabled ? `${cleanName(s.firstName)}.${cleanName(s.lastName)}@${emailDomain}` : null,
        passwordHash,
        roleId: roleId(s.role),
        staffProfile: {
          create: {
            employeeId: `EMP-${YEAR}-${pad(empSeq, 3)}`,
            firstName: s.firstName,
            lastName: s.lastName,
            gender: s.gender,
            cnic: cnic(),
            phone: phone(),
            designation: s.designation,
            qualification: s.qualification,
            joiningDate: dayOffset(-365 * (2 + (empSeq % 5))),
            departmentId: s.dept ? deptId[s.dept] : null,
          },
        },
      },
      include: { staffProfile: true },
    });
    staff.set(s.username, { userId: user.id, staffId: user.staffProfile!.id, role: s.role });
  }
  const st = (username: string) => {
    const v = staff.get(username);
    if (!v) throw new Error(`Unknown staff ${username}`);
    return v;
  };
  await prisma.department.update({ where: { id: deptCS.id }, data: { headId: st("hod.cs").userId } });
  await prisma.department.update({ where: { id: deptBA.id }, data: { headId: st("hod.ba").userId } });

  // ── 3. Programs, sessions, semesters ───────────────────────
  console.log("   🏫 Academic structure...");
  const programs = new Map<ProgramCode, { id: string; name: string; dept: "CS" | "BA" }>();
  const semesters = new Map<string, string>(); // `${program}:${sem}` → semester id
  const sessionName = `${YEAR}-${YEAR + 1}`;
  const semStart = dayOffset(-35);
  const semEnd = dayOffset(95);

  const semestersPerProgram: Record<ProgramCode, number[]> = { CS: [1, 3], IT: [1], BBA: [1, 3] };
  for (const p of PROGRAMS) {
    const program = await prisma.program.create({
      data: { name: p.name, code: p.code, departmentId: deptId[p.dept], description: `${p.name} (4 years, 8 semesters)`, durationYears: 4, totalSemesters: 8 },
    });
    programs.set(p.code, { id: program.id, name: p.name, dept: p.dept });

    const session = await prisma.academicSession.create({
      data: { name: sessionName, programId: program.id, startDate: dayOffset(-70), endDate: dayOffset(295), isActive: true },
    });
    for (const n of semestersPerProgram[p.code]) {
      const sem = await prisma.semester.create({
        data: { semesterNumber: n, type: "FALL", startDate: semStart, endDate: semEnd, isActive: true, academicSessionId: session.id },
      });
      semesters.set(`${p.code}:${n}`, sem.id);
    }
  }

  // ── 4. Courses ─────────────────────────────────────────────
  const courses = new Map<string, { id: string; code: string; name: string }>();
  for (const dept of ["CS", "BA"] as const) {
    for (const c of COURSES[dept]) {
      const course = await prisma.course.create({
        data: { code: c.code, name: c.name, creditHours: c.credit, isElective: !!c.elective, departmentId: deptId[dept], description: `${c.name} — ${dept === "CS" ? "Computer Science" : "Business Administration"} department` },
      });
      courses.set(c.code, { id: course.id, code: c.code, name: c.name });
    }
  }

  // ── 5. Sections, teachers, timetable ───────────────────────
  console.log("   📚 Sections & timetable...");
  interface SectionInfo {
    id: string;
    program: ProgramCode;
    semester: number;
    courseCode: string;
    courseName: string;
    teacher: string; // username
    days: number[];
    studentIds: string[];
    index: number;
  }
  const sections: SectionInfo[] = [];

  const busyTeacher = new Set<string>();
  const busyCohort = new Set<string>();
  const busyRoom = new Set<string>();
  const dayPairs = [[1, 3], [2, 4], [5, 6]];
  const timeSlots: [string, string][] = [["08:00", "09:30"], ["09:30", "11:00"], ["11:00", "12:30"], ["12:30", "14:00"]];
  const rooms = ["Room 101", "Room 102", "Room 103", "Room 104", "Room 201", "Room 202", "Lab 1", "Lab 2"];

  for (const p of PROGRAMS) {
    for (const sem of semestersPerProgram[p.code]) {
      const semesterId = semesters.get(`${p.code}:${sem}`)!;
      const plan = TEACHING[p.code][sem];
      const semCourseIds: string[] = [];

      for (const [courseCode, teacherUser] of Object.entries(plan)) {
        const course = courses.get(courseCode)!;
        semCourseIds.push(course.id);
        const teacher = st(teacherUser);

        const section = await prisma.section.create({
          data: { name: "A", capacity: 40, courseId: course.id, semesterId, teachers: { create: { staffProfileId: teacher.staffId, isPrimary: true } } },
        });

        // Greedy: first (day-pair, time, room) free for the teacher, the class cohort and the room
        let placed: { days: number[]; time: [string, string]; room: string } | null = null;
        outer: for (const time of timeSlots) {
          for (const days of dayPairs) {
            const tFree = days.every((d) => !busyTeacher.has(`${teacherUser}|${d}|${time[0]}`));
            const cFree = days.every((d) => !busyCohort.has(`${p.code}:${sem}|${d}|${time[0]}`));
            if (!tFree || !cFree) continue;
            const room = rooms.find((r) => days.every((d) => !busyRoom.has(`${r}|${d}|${time[0]}`)));
            if (!room) continue;
            placed = { days, time, room };
            break outer;
          }
        }
        if (!placed) throw new Error(`No timetable slot left for ${courseCode} (${p.code} sem ${sem})`);
        for (const d of placed.days) {
          busyTeacher.add(`${teacherUser}|${d}|${placed.time[0]}`);
          busyCohort.add(`${p.code}:${sem}|${d}|${placed.time[0]}`);
          busyRoom.add(`${placed.room}|${d}|${placed.time[0]}`);
        }
        await prisma.timetableSlot.createMany({
          data: placed.days.map((d) => ({ sectionId: section.id, dayOfWeek: d, startTime: placed!.time[0], endTime: placed!.time[1], room: placed!.room })),
        });

        sections.push({ id: section.id, program: p.code, semester: sem, courseCode, courseName: course.name, teacher: teacherUser, days: placed.days, studentIds: [], index: sections.length });
      }

      // semester ↔ course link
      await prisma.semester.update({ where: { id: semesterId }, data: { courses: { connect: semCourseIds.map((id) => ({ id })) } } });
    }
  }

  // ── 6. Students + enrollments ──────────────────────────────
  console.log("   🧑‍🎓 Students...");
  interface StudentInfo {
    spec: StudentSpec;
    username: string;
    userId: string;
    profileId: string;
    regNo: string;
    ability: number;
  }
  const students: StudentInfo[] = [];
  const regCounters = new Map<string, number>();
  const usedUsernames = new Set<string>();

  for (const spec of STUDENTS) {
    const admitYear = YEAR + (spec.admitOffset ?? 0);
    const prefix = `${admitYear}-${spec.program}`;
    if (!regCounters.has(prefix)) {
      regCounters.set(prefix, await prisma.studentProfile.count({ where: { registrationNo: { startsWith: prefix } } }));
    }
    regCounters.set(prefix, regCounters.get(prefix)! + 1);
    const regNo = `${prefix}-${pad(regCounters.get(prefix)!, 3)}`;

    let username = `${cleanName(spec.firstName)}.${cleanName(spec.lastName)}`;
    while (usedUsernames.has(username)) username += "1";
    usedUsernames.add(username);

    const status: StudentStatus = spec.status ?? "ACTIVE";
    const abilityBase = spec.att === "good" ? 0.82 : spec.att === "avg" ? 0.68 : 0.5;
    const ability = Math.min(0.97, Math.max(0.35, abilityBase + (rand() - 0.5) * 0.18));

    const user = await prisma.user.create({
      data: {
        username,
        email: `${username}@example.com`,
        collegeEmail: collegeEmailEnabled ? `${username}@${emailDomain}` : null,
        passwordHash,
        roleId: roleId("STUDENT"),
        isActive: status === "ACTIVE" || status === "ON_LEAVE",
        studentProfile: {
          create: {
            registrationNo: regNo,
            firstName: spec.firstName,
            lastName: spec.lastName,
            fatherName: `${["Muhammad", "Abdul", "Ghulam", "Rana", "Malik"][randInt(0, 4)]} ${spec.lastName}`,
            gender: spec.gender,
            dateOfBirth: new Date(Date.UTC(YEAR - 18 - (spec.semester > 1 ? 1 : 0) - randInt(0, 2), randInt(0, 11), randInt(1, 28))),
            cnic: cnic(),
            phone: phone(),
            personalEmail: `${username}@example.com`,
            address: `House ${randInt(1, 250)}, Street ${randInt(1, 30)}, ${["Model Town", "Johar Town", "Gulberg", "Iqbal Town", "Samanabad", "Township"][randInt(0, 5)]}, Lahore`,
            status,
            enrollmentDate: new Date(Date.UTC(admitYear, 8, 1)),
            graduationDate: status === "ALUMNI" ? dayOffset(-120) : null,
            currentSemester: spec.semester,
            programId: programs.get(spec.program)!.id,
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push({ spec, username, userId: user.id, profileId: user.studentProfile!.id, regNo, ability });
  }

  for (const stu of students) {
    if (stu.spec.status && stu.spec.status !== "ACTIVE") continue; // suspended / alumni: not enrolled
    for (const sec of sections.filter((s) => s.program === stu.spec.program && s.semester === stu.spec.semester)) {
      sec.studentIds.push(stu.profileId);
    }
  }
  await prisma.enrollment.createMany({
    data: sections.flatMap((sec) => sec.studentIds.map((studentProfileId) => ({ studentProfileId, sectionId: sec.id }))),
  });
  const enrolled = students.filter((s) => !s.spec.status || s.spec.status === "ACTIVE");
  const byUsername = (u: string) => {
    const s = students.find((x) => x.username === u);
    if (!s) throw new Error(`Unknown student ${u}`);
    return s;
  };

  // ── 7. Attendance (semester start → yesterday) ─────────────
  console.log("   🗓️  Attendance...");
  const rates: Record<Profile, [number, number, number]> = { good: [0.92, 0.04, 0.03], avg: [0.74, 0.08, 0.14], poor: [0.58, 0.07, 0.30] };
  const profileOf = new Map(students.map((s) => [s.profileId, s.spec.att]));
  let sessionCount = 0;
  let recordCount = 0;

  for (const sec of sections) {
    const teacher = st(sec.teacher);
    let lecture = 0;
    for (let d = semStart.getTime(); d <= todayUtc.getTime() - DAY; d += DAY) {
      const date = new Date(d);
      if (!sec.days.includes(date.getUTCDay())) continue;
      if (rand() < 0.06) continue; // class not held
      lecture += 1;

      const records = sec.studentIds.map((studentProfileId) => {
        const [pP, pL, pA] = rates[profileOf.get(studentProfileId) ?? "good"];
        const x = rand();
        const status: AttendanceStatus = x < pP ? "PRESENT" : x < pP + pL ? "LATE" : x < pP + pL + pA ? "ABSENT" : "EXCUSED";
        return { studentProfileId, status, remarks: status === "EXCUSED" ? "Approved leave" : null };
      });
      await prisma.attendanceSession.create({
        data: { sectionId: sec.id, date, topic: `${sec.courseCode} — Lecture ${lecture}`, markedById: teacher.userId, records: { create: records } },
      });
      sessionCount += 1;
      recordCount += records.length;
    }
  }
  console.log(`      ${sessionCount} sessions, ${recordCount} records`);

  // ── 8. Exams & results ─────────────────────────────────────
  console.log("   📝 Exams & results...");
  const abilityOf = new Map(students.map((s) => [s.profileId, s.ability]));
  const examDefs: { title: string; type: ExamType; total: number; pass: number; offset: number; duration: number }[] = [
    { title: "Quiz 1",       type: "QUIZ",    total: 10, pass: 4,  offset: -25, duration: 20 },
    { title: "Midterm Exam", type: "MIDTERM", total: 30, pass: 12, offset: -10, duration: 90 },
  ];
  for (const sec of sections) {
    for (const def of examDefs) {
      // every second section still has its midterm in "draft" so the publish flow can be shown
      const published = def.type === "QUIZ" || sec.index % 2 === 0;
      const exam = await prisma.exam.create({
        data: {
          title: `${sec.courseCode} ${def.title}`,
          type: def.type,
          sectionId: sec.id,
          totalMarks: def.total,
          passingMarks: def.pass,
          date: dayOffset(def.offset),
          duration: def.duration,
          instructions: def.type === "MIDTERM" ? "Bring your student card. Calculators are not allowed." : null,
          isPublished: published,
        },
      });
      await prisma.examResult.createMany({
        data: sec.studentIds.map((studentProfileId) => {
          const absent = rand() < 0.03;
          const ratio = Math.min(1, Math.max(0.1, (abilityOf.get(studentProfileId) ?? 0.7) + (rand() - 0.5) * 0.3));
          return {
            examId: exam.id,
            studentProfileId,
            isAbsent: absent,
            marksObtained: absent ? 0 : Math.round(def.total * ratio * 2) / 2,
            remarks: absent ? "Absent" : null,
            isPublished: published,
          };
        }),
      });
    }
    await prisma.exam.create({
      data: { title: `${sec.courseCode} Final Exam`, type: "FINAL", sectionId: sec.id, totalMarks: 50, passingMarks: 20, date: dayOffset(70 + (sec.index % 5)), duration: 180, instructions: "Datesheet will be notified by the exam office." },
    });
  }

  // ── 9. Fees ────────────────────────────────────────────────
  console.log("   💰 Fees...");
  const feeTypes = new Map((await prisma.feeType.findMany()).map((f) => [f.name, f.id]));
  const structures = new Map<ProgramCode, { id: string; required: number }>();
  for (const p of PROGRAMS) {
    const structure = await prisma.feeStructure.create({
      data: {
        name: `${p.name} — Fall ${YEAR}`,
        programId: programs.get(p.code)!.id,
        session: sessionName,
        items: {
          create: p.fees.map(([typeName, amount, isRequired]) => {
            const feeTypeId = feeTypes.get(typeName);
            if (!feeTypeId) throw new Error(`Fee type "${typeName}" missing — run the base seed first`);
            return { feeTypeId, amount, isRequired };
          }),
        },
      },
    });
    structures.set(p.code, { id: structure.id, required: p.fees.filter((f) => f[2]).reduce((sum, f) => sum + f[1], 0) });
  }

  let invSeq = await prisma.feeInvoice.count({ where: { invoiceNo: { startsWith: `INV-${YEAR}` } } });
  const nextInvoiceNo = () => `INV-${YEAR}-${pad((invSeq += 1), 6)}`;
  const clerks = [st("clerk.kamran").userId, st("clerk.hina").userId, st("headclerk").userId];
  const methods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE", "BANK_TRANSFER", "CASH"];
  let txn = 1000;
  const payment = (invoiceId: string, amount: number, paidAt: Date, i: number) => {
    const method = methods[i % methods.length];
    return {
      invoiceId,
      amount,
      method,
      paidAt,
      receivedById: clerks[i % clerks.length],
      transactionId: method === "CASH" ? null : `TXN-${YEAR}-${(txn += 1)}`,
    };
  };

  const plan = ["PAID", "PAID", "PARTIAL", "PAID", "UNPAID", "OVERDUE", "PAID", "PARTIAL", "PAID_DISCOUNT", "UNPAID", "PAID", "OVERDUE", "WAIVED"] as const;
  let payIdx = 0;
  for (let i = 0; i < enrolled.length; i++) {
    const stu = enrolled[i];
    const structure = structures.get(stu.spec.program)!;
    const total = structure.required;
    const kind = plan[i % plan.length];
    const discount = kind === "WAIVED" ? total : kind === "PAID_DISCOUNT" ? 5000 : 0;
    const issuedAt = atHour(-30, 5);

    let paid = 0;
    let status: FeeStatus = "UNPAID";
    let dueDate = dayOffset(12);
    if (kind === "PAID" || kind === "PAID_DISCOUNT") { paid = total - discount; status = "PAID"; dueDate = dayOffset(-5); }
    else if (kind === "PARTIAL") { paid = Math.round(total / 2); status = "PARTIAL"; dueDate = dayOffset(i % 2 === 0 ? 8 : -3); }
    else if (kind === "OVERDUE") { status = "OVERDUE"; dueDate = dayOffset(-6); }
    else if (kind === "WAIVED") { status = "WAIVED"; dueDate = dayOffset(-5); }

    const invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNo: nextInvoiceNo(),
        studentProfileId: stu.profileId,
        feeStructureId: structure.id,
        totalAmount: total,
        discountAmount: discount,
        paidAmount: paid,
        dueAmount: total - discount - paid,
        status,
        dueDate,
        issuedAt,
        semester: `Fall ${YEAR}`,
        remarks: kind === "WAIVED" ? "Full fee waiver — merit scholarship" : null,
      },
    });
    if (discount > 0) {
      await prisma.feeDiscount.create({
        data: { invoiceId: invoice.id, amount: discount, reason: kind === "WAIVED" ? "Merit scholarship — full waiver" : "Sibling discount", approvedById: st("headclerk").userId },
      });
    }
    if (paid > 0) {
      const split = i % 3 === 0 && kind !== "PARTIAL"; // some students pay in two instalments
      const first = split ? Math.round(paid * 0.6) : paid;
      await prisma.feePayment.create({ data: payment(invoice.id, first, atHour(-randInt(12, 26), 6 + randInt(0, 4)), payIdx++) });
      if (split) await prisma.feePayment.create({ data: payment(invoice.id, paid - first, atHour(-randInt(2, 10), 6 + randInt(0, 4)), payIdx++) });
    }
  }

  // Last semester's invoices (already paid) for the semester-3 intake → fee trend spans several months
  for (const stu of enrolled.filter((s) => s.spec.semester === 3)) {
    const structure = structures.get(stu.spec.program)!;
    const invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNo: nextInvoiceNo(),
        studentProfileId: stu.profileId,
        feeStructureId: structure.id,
        totalAmount: structure.required,
        paidAmount: structure.required,
        dueAmount: 0,
        status: "PAID",
        dueDate: dayOffset(-125),
        issuedAt: atHour(-150, 5),
        semester: `Spring ${YEAR}`,
      },
    });
    const first = Math.round(structure.required * 0.5);
    await prisma.feePayment.create({ data: payment(invoice.id, first, atHour(-randInt(125, 145), 7), payIdx++) });
    await prisma.feePayment.create({ data: payment(invoice.id, structure.required - first, atHour(-randInt(70, 100), 7), payIdx++) });
  }

  // ── 10. Library ────────────────────────────────────────────
  console.log("   📖 Library...");
  const librarian = st("librarian").userId;
  const bookRows = new Map<string, { id: string; copies: string[] }>();
  for (const b of BOOKS) {
    const book = await prisma.book.create({
      data: {
        title: b.title, author: b.author, isbn: b.isbn, publisher: b.publisher, edition: b.edition, year: b.year, category: b.category, totalCopies: b.copies,
        copies: { create: Array.from({ length: b.copies }, (_, i) => ({ copyNumber: `C${i + 1}`, location: `Shelf ${b.shelf}` })) },
      },
      include: { copies: true },
    });
    bookRows.set(b.title, { id: book.id, copies: book.copies.sort((x, y) => x.copyNumber.localeCompare(y.copyNumber)).map((c) => c.id) });
  }
  const copyId = (title: string, n: number) => {
    const row = bookRows.get(title);
    if (!row || !row.copies[n - 1]) throw new Error(`Missing copy ${title} C${n}`);
    return row.copies[n - 1];
  };
  const setCopy = (id: string, status: BookStatus) => prisma.bookCopy.update({ where: { id }, data: { status } });

  const FINE_PER_DAY = 5;
  const issues: { title: string; student: string; issued: number; due: number; returned?: number; finePaid?: boolean }[] = [
    // currently on loan
    { title: "Introduction to Algorithms",       student: "ahmed.bashir",  issued: -5,  due: 9 },
    { title: "Database System Concepts",         student: "sadia.perveen", issued: -10, due: 4 },
    { title: "Clean Code",                       student: "daniyal.khan",  issued: -25, due: -11 }, // overdue
    { title: "The C Programming Language",       student: "fatima.noor",   issued: -20, due: -6 },  // overdue
    { title: "Marketing Management",             student: "zara.hussain",  issued: -3,  due: 11 },
    // returned
    { title: "Calculus: Early Transcendentals",  student: "ali.raza",      issued: -30, due: -16, returned: -18 },
    { title: "Operating System Concepts",        student: "talha.mehmood", issued: -40, due: -26, returned: -20 },                  // 6 days late, fine unpaid
    { title: "Discrete Mathematics and Its Applications", student: "mahnoor.ali", issued: -35, due: -21, returned: -15, finePaid: true },
  ];
  for (const it of issues) {
    const cId = copyId(it.title, 1);
    const returnedAt = it.returned !== undefined ? atHour(it.returned, 8) : null;
    const dueDate = dayOffset(it.due);
    const daysLate = returnedAt && returnedAt > dueDate ? Math.ceil((returnedAt.getTime() - dueDate.getTime()) / DAY) : 0;
    await prisma.bookIssue.create({
      data: {
        bookCopyId: cId,
        studentProfileId: byUsername(it.student).profileId,
        issuedAt: atHour(it.issued, 7),
        dueDate,
        returnedAt,
        fine: daysLate * FINE_PER_DAY,
        finePaid: !!it.finePaid,
        issuedById: librarian,
        returnedById: returnedAt ? librarian : null,
      },
    });
    if (!returnedAt) await setCopy(cId, "ISSUED");
  }
  await setCopy(copyId("Design Patterns", 2), "LOST");
  await setCopy(copyId("Clean Code", 2), "DAMAGED");
  await setCopy(copyId("Computer Networking: A Top-Down Approach", 3), "UNDER_REPAIR");
  await setCopy(copyId("Marketing Management", 2), "RESERVED");

  // ── 11. Complaints ─────────────────────────────────────────
  console.log("   📣 Complaints...");
  const categories = new Map((await prisma.complaintCategory.findMany()).map((c) => [c.name, c.id]));
  const category = (name: string) => {
    const id = categories.get(name);
    if (!id) throw new Error(`Complaint category "${name}" missing — run the base seed first`);
    return id;
  };
  interface ComplaintSeed {
    title: string; description: string; category: string; student: string; status: ComplaintStatus; createdDaysAgo: number;
    assignee?: string; path: ComplaintStatus[]; comments?: { author: string; content: string; internal?: boolean; daysAgo: number }[];
  }
  const complaintSeeds: ComplaintSeed[] = [
    { title: "Fee voucher shows the wrong amount", description: "My fee voucher includes the lab fee although I am in the BBA program. Please correct the amount before the due date.",
      category: "Fee Complaint", student: "komal.riaz", status: "SUBMITTED", createdDaysAgo: 2, path: ["SUBMITTED"] },
    { title: "Midterm marks of CS101 not uploaded", description: "It has been two weeks since the CS101 midterm and the marks are still not visible in my portal.",
      category: "Academic Complaint", student: "omar.farooq", status: "UNDER_REVIEW", createdDaysAgo: 5, assignee: "hod.cs", path: ["SUBMITTED", "UNDER_REVIEW"],
      comments: [{ author: "hod.cs", content: "Looking into this with the course teacher.", daysAgo: 4 }, { author: "hod.cs", content: "Teacher confirms marks are ready; will be published after moderation.", internal: true, daysAgo: 3 }] },
    { title: "Library fine charged although book was returned", description: "I returned 'Operating System Concepts' on time but a fine is showing against my account.",
      category: "Library Complaint", student: "talha.mehmood", status: "IN_PROGRESS", createdDaysAgo: 6, assignee: "librarian", path: ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS"],
      comments: [{ author: "librarian", content: "Checking the return register for that date.", daysAgo: 5 }, { author: "talha.mehmood", content: "I have the return slip, I can bring it tomorrow.", daysAgo: 4 }] },
    { title: "Air conditioner not working in Room 102", description: "The AC in Room 102 has been broken for a week and afternoon classes are very uncomfortable.",
      category: "General Complaint", student: "adeel.anwar", status: "RESOLVED", createdDaysAgo: 14, assignee: "complaints", path: ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"],
      comments: [{ author: "complaints", content: "Maintenance has been informed.", daysAgo: 12 }, { author: "complaints", content: "AC repaired on Monday. Please confirm.", daysAgo: 8 }] },
    { title: "Absent marked by mistake on a class I attended", description: "I was present in the Data Structures class last week but my attendance shows absent.",
      category: "Academic Complaint", student: "daniyal.khan", status: "RESOLVED", createdDaysAgo: 9, assignee: "hod.cs", path: ["SUBMITTED", "UNDER_REVIEW", "RESOLVED"],
      comments: [{ author: "hod.cs", content: "Teacher has corrected the record.", daysAgo: 6 }] },
    { title: "Spelling mistake in my name on the student card", description: "My surname is spelled incorrectly on the student card. Request to correct and reissue.",
      category: "General Complaint", student: "nimra.tariq", status: "CLOSED", createdDaysAgo: 25, assignee: "complaints", path: ["SUBMITTED", "UNDER_REVIEW", "RESOLVED", "CLOSED"],
      comments: [{ author: "complaints", content: "New card issued, collect from the admin office.", daysAgo: 20 }] },
    { title: "Late-payment surcharge is unfair", description: "I paid my fee one day late due to a bank holiday and was charged a surcharge.",
      category: "Fee Complaint", student: "junaid.alam", status: "REJECTED", createdDaysAgo: 18, assignee: "headclerk", path: ["SUBMITTED", "UNDER_REVIEW", "REJECTED"],
      comments: [{ author: "headclerk", content: "The surcharge follows the published fee policy; bank holidays are not an exemption.", daysAgo: 15 }] },
  ];
  for (const c of complaintSeeds) {
    const stu = byUsername(c.student);
    const created = atHour(-c.createdDaysAgo, 6);
    const userIdOf = (u: string) => (staff.get(u)?.userId ?? byUsername(u).userId);
    const assigneeId = c.assignee ? st(c.assignee).userId : null;
    const complaint = await prisma.complaint.create({
      data: {
        title: c.title, description: c.description, status: c.status, categoryId: category(c.category),
        createdById: stu.userId, studentProfileId: stu.profileId, assignedToId: assigneeId,
        createdAt: created,
        statusHistory: {
          create: c.path.map((to, i) => ({
            fromStatus: i === 0 ? null : c.path[i - 1],
            toStatus: to,
            changedById: i === 0 ? stu.userId : assigneeId ?? admin.id,
            note: i === 0 ? "Complaint submitted" : null,
            createdAt: atHour(-Math.max(0, c.createdDaysAgo - i * 2), 7),
          })),
        },
        comments: {
          create: (c.comments ?? []).map((m) => ({ authorId: userIdOf(m.author), content: m.content, isInternal: !!m.internal, createdAt: atHour(-m.daysAgo, 8) })),
        },
      },
    });
    void complaint;
  }

  // ── 12. Notices ────────────────────────────────────────────
  console.log("   📌 Notices...");
  const notices: { title: string; content: string; category: string; audience: NoticeAudience; dept?: "CS" | "BA"; program?: ProgramCode; by: string; published: boolean; daysAgo: number; expiresIn?: number }[] = [
    { title: "Midterm examination schedule", content: "Midterm exams for all programs have been completed. Results are being published section by section. Contact your course teacher for any query.", category: "Examination", audience: "ALL", by: "admin", published: true, daysAgo: 8 },
    { title: "Fee submission deadline", content: "Students are reminded to clear Fall fee invoices before the due date printed on the voucher. Late payments attract a surcharge as per the fee policy.", category: "Finance", audience: "STUDENTS", by: "headclerk", published: true, daysAgo: 12, expiresIn: 20 },
    { title: "Faculty meeting — curriculum review", content: "All faculty members are requested to attend the curriculum review meeting in the seminar hall. Please bring your course outlines.", category: "Administrative", audience: "STAFF", by: "admin", published: true, daysAgo: 4, expiresIn: 3 },
    { title: "Workshop: Git and GitHub for beginners", content: "The Computer Science department is hosting a hands-on workshop on Git and GitHub. Open to all CS and IT students; seats are limited.", category: "Events", audience: "DEPARTMENT", dept: "CS", by: "hod.cs", published: true, daysAgo: 3, expiresIn: 15 },
    { title: "BBA industrial visit — registration open", content: "BBA students can register for the industrial visit with the department office. A small transport charge applies.", category: "Events", audience: "PROGRAM", program: "BBA", by: "hod.ba", published: true, daysAgo: 6, expiresIn: 25 },
    { title: "Library timings revised", content: "The library is now open from 8:30 am to 5:00 pm on weekdays and 9:00 am to 1:00 pm on Saturdays.", category: "Library", audience: "ALL", by: "librarian", published: true, daysAgo: 20 },
    { title: "Independence Day holiday", content: "The college remained closed on 14th August. Classes resumed the following working day.", category: "Holidays", audience: "ALL", by: "admin", published: true, daysAgo: 58, expiresIn: -30 },
    { title: "Annual sports gala (draft)", content: "Draft announcement for the annual sports gala — dates to be confirmed with the sports committee.", category: "Events", audience: "ALL", by: "admin", published: false, daysAgo: 1 },
  ];
  for (const n of notices) {
    await prisma.notice.create({
      data: {
        title: n.title, content: n.content, category: n.category, audience: n.audience,
        departmentId: n.dept ? deptId[n.dept] : null,
        programId: n.program ? programs.get(n.program)!.id : null,
        isPublished: n.published,
        publishedAt: n.published ? atHour(-n.daysAgo, 5) : null,
        expiresAt: n.expiresIn !== undefined ? dayOffset(n.expiresIn) : null,
        createdById: n.by === "admin" ? admin.id : st(n.by).userId,
        createdAt: atHour(-n.daysAgo, 5),
      },
    });
  }

  // ── 13. Admissions ─────────────────────────────────────────
  console.log("   📨 Admissions...");
  let appSeq = await prisma.application.count({ where: { applicationNo: { startsWith: `APP-${YEAR}` } } });
  const reviewer = st("headclerk").userId;
  const applicants: { first: string; last: string; gender: Gender; program: ProgramCode; status: ApplicationStatus; daysAgo: number; remarks?: string; linkedStudent?: string }[] = [
    { first: "Bushra",  last: "Aziz",     gender: "FEMALE", program: "CS",  status: "SUBMITTED",    daysAgo: 1 },
    { first: "Moiz",    last: "Qureshi",  gender: "MALE",   program: "IT",  status: "SUBMITTED",    daysAgo: 2 },
    { first: "Areeba",  last: "Khalid",   gender: "FEMALE", program: "BBA", status: "UNDER_REVIEW", daysAgo: 4 },
    { first: "Shahzaib", last: "Butt",    gender: "MALE",   program: "CS",  status: "SHORTLISTED",  daysAgo: 7, remarks: "Strong merit — call for interview" },
    { first: "Mehwish", last: "Ijaz",     gender: "FEMALE", program: "BBA", status: "APPROVED",     daysAgo: 9, remarks: "Approved — awaiting fee voucher" },
    { first: "Taimoor", last: "Zafar",    gender: "MALE",   program: "IT",  status: "FEE_PENDING",  daysAgo: 12, remarks: "Admission fee voucher issued" },
    { first: "Noman",   last: "Saleem",   gender: "MALE",   program: "CS",  status: "REJECTED",     daysAgo: 15, remarks: "Did not meet minimum merit" },
    { first: "Amna",    last: "Rehman",   gender: "FEMALE", program: "BBA", status: "WAITLISTED",   daysAgo: 10, remarks: "Waitlisted — seat will be offered if available" },
    { first: "Laiba",   last: "Sheikh",   gender: "FEMALE", program: "IT",  status: "ENROLLED",     daysAgo: 45, remarks: "Enrolled as student", linkedStudent: "laiba.sheikh" },
    { first: "Hamid",   last: "Raza",     gender: "MALE",   program: "CS",  status: "DRAFT",        daysAgo: 0 },
  ];
  const pipeline: ApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "APPROVED", "FEE_PENDING", "ENROLLED"];
  for (const a of applicants) {
    appSeq += 1;
    const linked = a.linkedStudent ? byUsername(a.linkedStudent) : null;
    const emailBase = `${cleanName(a.first)}.${cleanName(a.last)}`;
    const history: ApplicationStatus[] =
      a.status === "DRAFT" ? ["DRAFT"]
      : a.status === "REJECTED" ? ["SUBMITTED", "UNDER_REVIEW", "REJECTED"]
      : a.status === "WAITLISTED" ? ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED"]
      : pipeline.slice(0, pipeline.indexOf(a.status) + 1);
    const reviewed = !["DRAFT", "SUBMITTED"].includes(a.status);
    await prisma.application.create({
      data: {
        applicationNo: `APP-${YEAR}-${pad(appSeq, 6)}`,
        programId: programs.get(a.program)!.id,
        firstName: a.first, lastName: a.last,
        fatherName: `Muhammad ${a.last}`,
        email: linked ? `${linked.username}@example.com` : `${emailBase}@example.com`,
        phone: phone(), cnic: linked ? undefined : cnic(), gender: a.gender,
        dateOfBirth: new Date(Date.UTC(YEAR - 18, randInt(0, 11), randInt(1, 28))),
        address: `House ${randInt(1, 250)}, ${["Model Town", "Johar Town", "Gulberg"][randInt(0, 2)]}, Lahore`,
        status: a.status,
        submittedAt: a.status === "DRAFT" ? null : atHour(-a.daysAgo, 6),
        reviewedById: reviewed ? reviewer : null,
        reviewedAt: reviewed ? atHour(-Math.max(0, a.daysAgo - 2), 6) : null,
        remarks: a.remarks,
        studentProfileId: linked?.profileId,
        createdAt: atHour(-a.daysAgo, 6),
        statusHistory: {
          create: history.map((to, i) => ({
            fromStatus: i === 0 ? null : history[i - 1],
            toStatus: to,
            changedById: i === 0 ? null : reviewer,
            note: i === history.length - 1 ? a.remarks : null,
            createdAt: atHour(-Math.max(0, a.daysAgo - i), 6),
          })),
        },
      },
    });
  }

  // ── 14. Notifications ──────────────────────────────────────
  console.log("   🔔 Notifications...");
  const ids = (...usernames: string[]) => usernames.map((u) => staff.get(u)?.userId ?? byUsername(u).userId);
  const notifs: { title: string; body: string; to: string[]; readBy?: string[]; daysAgo: number }[] = [
    { title: "New admission applications", body: "2 new applications were submitted today and are waiting for review.", to: ["headclerk", "admin"].map((u) => (u === "admin" ? admin.id : st(u).userId)), daysAgo: 1 },
    { title: "Complaint assigned to you", body: "'Midterm marks of CS101 not uploaded' has been assigned to you.", to: ids("hod.cs"), daysAgo: 5 },
    { title: "Complaint assigned to you", body: "'Library fine charged although book was returned' has been assigned to you.", to: ids("librarian"), daysAgo: 6 },
    { title: "Quiz 1 results published", body: "Quiz 1 results are now available in your portal.", to: ids("ali.raza", "fatima.noor", "hassan.mahmood", "zainab.akhtar", "omar.farooq", "hira.aslam"), readBy: ["ali.raza", "fatima.noor"], daysAgo: 20 },
    { title: "Fee invoice generated", body: `Your Fall ${YEAR} fee invoice is ready. Please pay before the due date.`, to: enrolled.map((s) => s.userId), readBy: enrolled.slice(0, 8).map((s) => s.username), daysAgo: 30 },
    { title: "Library book due soon", body: "'Database System Concepts' is due in 4 days.", to: ids("sadia.perveen"), daysAgo: 1 },
    { title: "Library book overdue", body: "'Clean Code' is overdue. A fine of Rs. 5 per day applies.", to: ids("daniyal.khan"), daysAgo: 2 },
    { title: "Faculty meeting reminder", body: "Curriculum review meeting is scheduled for this week.", to: ids("hod.cs", "hod.ba", "teacher.ayesha", "teacher.usman", "teacher.sana", "teacher.bilal", "teacher.hamza", "teacher.maryam"), daysAgo: 3 },
  ];
  for (const n of notifs) {
    const readSet = new Set((n.readBy ?? []).map((u) => staff.get(u)?.userId ?? byUsername(u).userId));
    await prisma.notification.create({
      data: {
        title: n.title, body: n.body, channel: "IN_APP", createdAt: atHour(-n.daysAgo, 6),
        recipients: { create: n.to.map((userId) => ({ userId, isRead: readSet.has(userId), readAt: readSet.has(userId) ? atHour(-n.daysAgo, 9) : null })) },
      },
    });
  }

  // ── 15. Audit trail samples ────────────────────────────────
  console.log("   🧾 Audit log...");
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: "LOGIN", module: "auth", createdAt: atHour(-1, 4), ipAddress: "127.0.0.1" },
      { userId: admin.id, action: "STUDENT_CREATE", module: "students", entityId: enrolled[0].userId, newData: { registrationNo: enrolled[0].regNo }, createdAt: atHour(-33, 5) },
      { userId: admin.id, action: "SECTION_CREATE", module: "academic", entityId: sections[0].id, newData: { course: sections[0].courseCode }, createdAt: atHour(-36, 5) },
      { userId: st("headclerk").userId, action: "DISCOUNT_APPLY", module: "finance", newData: { reason: "Sibling discount", amount: 5000 }, createdAt: atHour(-28, 6) },
      { userId: st("hod.cs").userId, action: "COMPLAINT_STATUS_CHANGE", module: "complaints", oldData: { status: "SUBMITTED" }, newData: { status: "UNDER_REVIEW" }, createdAt: atHour(-4, 6) },
      { userId: st("teacher.ayesha").userId, action: "ATTENDANCE_MARK", module: "attendance", newData: { sectionId: sections[0].id, recordCount: sections[0].studentIds.length }, createdAt: atHour(-2, 6) },
      { userId: st("teacher.usman").userId, action: "ATTENDANCE_UPDATE", module: "attendance", oldData: { status: "ABSENT" }, newData: { status: "EXCUSED" }, createdAt: atHour(-3, 7) },
      { userId: st("librarian").userId, action: "BOOK_ISSUE", module: "library", newData: { title: "Introduction to Algorithms" }, createdAt: atHour(-5, 7) },
      { userId: st("headclerk").userId, action: "APPLICATION_REVIEW", module: "admissions", newData: { status: "SHORTLISTED" }, createdAt: atHour(-6, 6) },
    ],
  });

  // ── Summary ────────────────────────────────────────────────
  console.log(`
   ✅ Demo data ready: 2 departments, 3 programs, ${sections.length} sections, ${STAFF.length} staff, ${students.length} students.

   Login with these accounts (password for all demo users: ${DEMO_PASSWORD}):
     HOD            hod.cs  /  hod.ba
     Teachers       teacher.ayesha  teacher.usman  teacher.sana  teacher.bilal  teacher.hamza  teacher.maryam
     Head clerk     headclerk
     Clerks         clerk.kamran  clerk.hina
     Complaints     complaints
     Librarian      librarian
     Students       ali.raza  fatima.noor  omar.farooq (low attendance)  ahmed.bashir (sem 3)  saad.chaudhry (BBA)  ...
`);
}
