import Link from "next/link";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";
import { fullName, type StudentListItem } from "../types";

export function getStudentColumns(basePath: string): Column<StudentListItem>[] {
  return [
    {
      id: "student",
      header: "Student",
      cell: (s) => (
        <div className="min-w-0">
          <Link
            href={`${basePath}/students/${s.id}`}
            onClick={(e) => e.stopPropagation()} // the row itself is also clickable
            className="font-medium hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {fullName(s.studentProfile)}
          </Link>
          <p className="truncate text-xs text-muted-foreground">@{s.username}</p>
        </div>
      ),
    },
    { id: "regNo", header: "Reg. No", cell: (s) => <span className="tabular-nums">{s.studentProfile.registrationNo}</span> },
    {
      id: "program",
      header: "Program",
      cell: (s) => <span title={s.studentProfile.program.name}>{s.studentProfile.program.code}</span>,
    },
    { id: "semester", header: "Semester", align: "center", hideOnMobile: true, cell: (s) => s.studentProfile.currentSemester ?? "—" },
    { id: "status", header: "Status", cell: (s) => <StatusBadge status={s.studentProfile.status} /> },
    { id: "enrolled", header: "Enrolled", hideOnMobile: true, cell: (s) => formatDate(s.studentProfile.enrollmentDate) },
    {
      id: "contact",
      header: "Contact",
      hideOnMobile: true,
      cell: (s) => <span className="text-muted-foreground">{s.studentProfile.phone || s.email}</span>,
    },
  ];
}
