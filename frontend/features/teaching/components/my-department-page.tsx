"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, GraduationCap, Users } from "lucide-react";
import { CoursesTab } from "@/features/academic/components/courses-tab";
import { SectionsTab } from "@/features/academic/components/sections-tab";
import { getData } from "@/lib/api-helpers";
import { useRole } from "@/hooks/use-role";
import { useStaffList, useStaffMember } from "@/features/staff/hooks";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StaffListItem } from "@/features/staff/types";

interface DepartmentDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  programs: { id: string; name: string; code: string }[];
  _count: { programs: number; staffProfiles: number };
}

export function MyDepartmentPage() {
  const { userId } = useRole();
  const me = useStaffMember(userId ?? "");
  const departmentId = me.data?.staffProfile.department?.id ?? "";
  const dept = useQuery({ queryKey: ["academic", "department", departmentId], queryFn: () => getData<DepartmentDetail>(`/academic/departments/${departmentId}`), enabled: !!departmentId });
  const faculty = useStaffList({ page: 1, limit: 50, departmentId }, !!departmentId);
  const [tab, setTab] = useState("courses");

  if (me.isLoading) return <div aria-busy="true" className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-40" /></div>;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  if (!departmentId) return <EmptyState icon={Building2} title="No department linked to your account" description="Ask the administrator to set your department on your staff profile." />;

  const columns: Column<StaffListItem>[] = [
    { id: "name", header: "Name", cell: (s) => <div><p className="font-medium">{s.staffProfile ? `${s.staffProfile.firstName} ${s.staffProfile.lastName}` : s.username}</p><p className="text-xs text-muted-foreground">{s.staffProfile?.designation ?? s.role.displayName}</p></div> },
    { id: "role", header: "Role", hideOnMobile: true, cell: (s) => s.role.displayName },
    { id: "status", header: "Status", cell: (s) => (s.staffProfile ? <StatusBadge status={s.staffProfile.status} /> : "—") },
  ];

  return (
    <>
      <PageHeader title={dept.data?.name ?? "My department"} description={dept.data ? `${dept.data.code}${dept.data.description ? ` · ${dept.data.description}` : ""}` : undefined} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title="Programs" value={dept.data?._count.programs} icon={GraduationCap} loading={dept.isLoading} description={dept.data?.programs.map((p) => p.code).join(", ")} />
        <StatCard title="Active staff" value={dept.data?._count.staffProfiles} icon={Users} loading={dept.isLoading} />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Department sections">
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
        </TabsList>
        <TabsContent value="courses"><CoursesTab canManage fixedDepartmentId={departmentId} /></TabsContent>
        <TabsContent value="sections"><SectionsTab canManage /></TabsContent>
        <TabsContent value="faculty">
          <DataTable caption="Department faculty" columns={columns} data={faculty.data?.data} getRowId={(s) => s.id} isLoading={faculty.isLoading} isError={faculty.isError} error={faculty.error} onRetry={() => faculty.refetch()} empty={{ icon: Users, title: "No staff in this department" }} />
        </TabsContent>
      </Tabs>
    </>
  );
}
