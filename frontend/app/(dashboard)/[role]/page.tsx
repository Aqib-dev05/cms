"use client";

import { ComplaintOfficerDashboard, FinanceDashboard, LibrarianDashboard, StudentDashboard, TeachingDashboard } from "@/features/dashboard/components/role-dashboards";
import { RoleSwitch } from "@/components/shared/role-switch";

/** Dashboard home for every role except ADMIN (which has its own static page at /admin). */
export default function DashboardHomePage() {
  return (
    <RoleSwitch
      views={{
        STUDENT: <StudentDashboard />,
        TEACHER: <TeachingDashboard />,
        HOD: <TeachingDashboard />,
        HEAD_CLERK: <FinanceDashboard />,
        CLERK: <FinanceDashboard />,
        LIBRARIAN: <LibrarianDashboard />,
        COMPLAINT_OFFICER: <ComplaintOfficerDashboard />,
      }}
    />
  );
}
