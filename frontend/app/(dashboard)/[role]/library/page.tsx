"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { LibraryAdminPage } from "@/features/library/components/library-admin-page";
import { MyLibraryPage } from "@/features/library/components/my-library-page";

export default function LibraryRoute() {
  return <RoleSwitch views={{ ADMIN: <LibraryAdminPage />, STUDENT: <MyLibraryPage /> }} />;
}
