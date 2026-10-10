"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { MyAttendancePage } from "@/features/attendance/components/my-attendance-page";
import { StaffAttendancePage } from "@/features/attendance/components/staff-attendance-page";

export default function AttendanceRoute() {
  return (
    <RoleSwitch
      views={{
        ADMIN: <StaffAttendancePage />,
        HOD: <StaffAttendancePage />,
        TEACHER: <StaffAttendancePage />,
        STUDENT: <MyAttendancePage />,
      }}
    />
  );
}
