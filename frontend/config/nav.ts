import {
  Award,
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
        { label: "Fee Structures", slug: "fee-structures", icon: Layers },
        { label: "Clerks", slug: "clerks", icon: Users },
        { label: "Reports", slug: "reports", icon: BarChart3 },
      ],
    },
  ],
  CLERK: [
    { items: [home] },
    {
      label: "Finance",
      items: [
        { label: "Invoices", slug: "invoices", icon: Receipt },
        { label: "Payments", slug: "payments", icon: CreditCard },
        { label: "Students", slug: "students", icon: GraduationCap },
      ],
    },
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

export function getNav(role: RoleName): NavGroup[] {
  const base = `/${ROLE_BASE_PATH[role]}`;
  return NAV[role].map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      label: item.label,
      href: item.slug ? `${base}/${item.slug}` : base,
      icon: item.icon,
      isHome: item.slug === "",
    })),
  }));
}
