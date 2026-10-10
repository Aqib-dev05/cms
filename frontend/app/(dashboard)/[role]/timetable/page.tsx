"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { ManageTimetablePage, MyTimetablePage } from "@/features/timetable/components/timetable-page";

export default function TimetableRoute() {
  return (
    <RoleSwitch
      views={{
        ADMIN: <ManageTimetablePage />,
        HOD: <MyTimetablePage kind="teaching" />,
        TEACHER: <MyTimetablePage kind="teaching" />,
        STUDENT: <MyTimetablePage kind="student" />,
      }}
    />
  );
}
