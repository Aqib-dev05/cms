import {
  Award,
  BadgeCheck,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarOff,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
  Megaphone,
  PiggyBank,
  MessageSquareWarning,
  Receipt,
  School,
  ScrollText,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { RoleName } from "@/types";
import { ROLE_BASE_PATH } from "./roles";

interface NavItemDef {
  label: string;
  /** path relative to the role base; "" = dashboard home */
  slug: string;
  icon: LucideIcon;
  /** hide the item for users who lack this permission (ADMIN always sees everything) */
  permission?: string;
}
interface NavGroupDef {
  label?: string;
  items: NavItemDef[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** true for the role's dashboard home (matched exactly when highlighting) */
  isHome: boolean;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

const home: NavItemDef = { label: "Dashboard", slug: "", icon: LayoutDashboard };
const notices: NavItemDef = { label: "Notices", slug: "notices", icon: Megaphone };
const timetable: NavItemDef = { label: "Timetable", slug: "timetable", icon: CalendarDays };
const attendance: NavItemDef = { label: "Attendance", slug: "attendance", icon: ClipboardCheck };

const NAV: Record<RoleName, NavGroupDef[]> = {
  ADMIN: [
    { items: [home] },
    {
      label: "Academics",
      items: [
        { label: "Academic Setup", slug: "academic", icon: Building2 },
        { label: "Students", slug: "students", icon: GraduationCap },
        { label: "Staff", slug: "staff", icon: Users },
        timetable,
      ],
    },
    {
      label: "Operations",
      items: [
        attendance,
        { label: "Exams & Results", slug: "exams", icon: Award },
        { label: "Finance", slug: "finance", icon: Wallet },
        { label: "Fee Structures", slug: "fee-structures", icon: Layers },
        { label: "Library", slug: "library", icon: Library },
        { label: "Admissions", slug: "admissions", icon: UserPlus },
      ],
    },
    {
      label: "Communication",
      items: [{ label: "Complaints", slug: "complaints", icon: MessageSquareWarning }, notices],
    },
    {
      label: "System",
      items: [
        { label: "Users & Roles", slug: "users", icon: UserCog },
        { label: "Audit Logs", slug: "audit", icon: ScrollText },
      ],
    },
  ],
  HOD: [
    { items: [home] },
    {
      label: "Department",
      items: [
        { label: "My Department", slug: "department", icon: Building2 },
        { label: "Staff", slug: "staff", icon: Users },
        { label: "My Leave", slug: "leave", icon: CalendarOff },
      ],
    },
    {
      label: "Teaching",
      items: [
        { label: "My Classes", slug: "classes", icon: School },
        timetable,
        attendance,
        { label: "Exams & Grades", slug: "exams", icon: Award },
      ],
    },
    { label: "Communication", items: [notices] },
  ],
  TEACHER: [
    { items: [home] },
    {
      label: "Teaching",
      items: [
        { label: "My Classes", slug: "classes", icon: School },
        timetable,
        attendance,
        { label: "Exams & Grades", slug: "exams", icon: Award },
      ],
    },
    {
      label: "More",
      items: [{ label: "My Leave", slug: "leave", icon: CalendarOff }, notices],
    },
  ],
  HEAD_CLERK: [
    { items: [home] },
    {
      label: "Finance",
      items: [
        { label: "Invoices", slug: "invoices", icon: Receipt },
        { label: "Payments", slug: "payments", icon: CreditCard },
        { label: "Verification", slug: "verification", icon: BadgeCheck },
        { label: "Fee Structures", slug: "fee-structures", icon: Layers },
        { label: "College Fund", slug: "fund", icon: PiggyBank },
        { label: "Reports", slug: "reports", icon: BarChart3 },
      ],
    },
    {
      label: "Records",
      items: [
        { label: "Students", slug: "students", icon: GraduationCap },
        { label: "Admissions", slug: "admissions", icon: UserPlus },
      ],
    },
    { label: "My team", items: [{ label: "Assistants", slug: "assistants", icon: UserCog }] },
  ],
  // Assistant clerks only see what the head clerk ticked for them (permission-gated)
  CLERK: [
    { items: [home] },
    {
      label: "Finance",
      items: [
        { label: "Invoices", slug: "invoices", icon: Receipt, permission: "fee.read" },
        { label: "Payments", slug: "payments", icon: CreditCard, permission: "payment.create" },
        { label: "Verification", slug: "verification", icon: BadgeCheck, permission: "payment.verify" },
        { label: "College Fund", slug: "fund", icon: PiggyBank, permission: "fund.read" },
        { label: "Reports", slug: "reports", icon: BarChart3, permission: "finance.report" },
      ],
    },
    {
      label: "Records",
      items: [
        { label: "Students", slug: "students", icon: GraduationCap, permission: "student.read" },
        { label: "Admissions", slug: "admissions", icon: UserPlus, permission: "admission.read" },
      ],
    },
    { label: "Communication", items: [notices] },
  ],
  COMPLAINT_OFFICER: [
    { items: [home] },
    { label: "Grievances", items: [{ label: "Complaints", slug: "complaints", icon: MessageSquareWarning }, notices] },
  ],
  LIBRARIAN: [
    { items: [home] },
    {
      label: "Library",
      items: [
        { label: "Books", slug: "books", icon: BookOpen },
        { label: "Issue & Return", slug: "issues", icon: BookMarked },
      ],
    },
    { label: "Communication", items: [notices] },
  ],
  STUDENT: [
    { items: [home] },
    {
      label: "Academics",
      items: [
        { label: "My Courses", slug: "courses", icon: BookOpen },
        timetable,
        attendance,
        { label: "Results", slug: "results", icon: Award },
      ],
    },
    {
      label: "Services",
      items: [
        { label: "Fees", slug: "fees", icon: Wallet },
        { label: "Library", slug: "library", icon: Library },
        { label: "Complaints", slug: "complaints", icon: MessageSquareWarning },
        notices,
      ],
    },
  ],
};

export function getNav(role: RoleName, permissions?: string[]): NavGroup[] {
  const base = `/${ROLE_BASE_PATH[role]}`;
  const visible = (item: NavItemDef) => !item.permission || role === "ADMIN" || !permissions || permissions.includes(item.permission);
  return NAV[role]
    .map((group) => ({
      label: group.label,
      items: group.items.filter(visible).map((item) => ({
        label: item.label,
        href: item.slug ? `${base}/${item.slug}` : base,
        icon: item.icon,
        isHome: item.slug === "",
      })),
    }))
    .filter((group) => group.items.length > 0);
}
