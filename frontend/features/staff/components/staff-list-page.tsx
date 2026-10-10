"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilterX, Users } from "lucide-react";
import { useDepartments } from "@/features/academic/hooks";
import { usePageState } from "@/hooks/use-page-state";
import { humanize } from "@/lib/format";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { RoleName } from "@/types";
import { useStaffList } from "../hooks";
import { STAFF_STATUSES, type StaffListItem, type StaffStatus } from "../types";

const ROLE_FILTERS: { value: RoleName; label: string }[] = [
  { value: "HOD", label: "Head of Department" },
  { value: "TEACHER", label: "Teacher" },
  { value: "HEAD_CLERK", label: "Head Clerk" },
  { value: "CLERK", label: "Clerk" },
  { value: "LIBRARIAN", label: "Librarian" },
  { value: "COMPLAINT_OFFICER", label: "Complaint Officer" },
  { value: "ADMIN", label: "Administrator" },
];

interface StaffListPageProps {
  basePath: string;
  title?: string;
  description?: string;
  /** lock the list to one role (e.g. head clerk → CLERK) */
  fixedRole?: RoleName;
  /** rows link to a detail page */
  linkRows?: boolean;
}

export function StaffListPage({ basePath, title = "Staff", description = "Faculty and employees.", fixedRole, linkRows = true }: StaffListPageProps) {
  const router = useRouter();
  const { page, limit, params, setPage, setLimit, setSearch } = usePageState(20);
  const [role, setRole] = useState<RoleName | "">("");
  const [status, setStatus] = useState<StaffStatus | "">("");
  const [departmentId, setDepartmentId] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const departments = useDepartments();

  const q = useStaffList({ ...params, role: fixedRole ?? (role || undefined), status: status || undefined, departmentId: departmentId || undefined });
  const filtersActive = !!(role || status || departmentId || params.search);
  const clear = () => {
    setRole("");
    setStatus("");
    setDepartmentId("");
    setSearch("");
    setSearchKey((k) => k + 1);
  };

  const columns: Column<StaffListItem>[] = [
    {
      id: "name",
      header: "Name",
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-medium">{s.staffProfile ? `${s.staffProfile.firstName} ${s.staffProfile.lastName}` : s.username}</p>
          <p className="truncate text-xs text-muted-foreground">@{s.username}</p>
        </div>
      ),
    },
    { id: "emp", header: "Employee ID", hideOnMobile: true, cell: (s) => <span className="tabular-nums">{s.staffProfile?.employeeId ?? "—"}</span> },
    { id: "role", header: "Role", cell: (s) => s.role.displayName },
    { id: "dept", header: "Department", hideOnMobile: true, cell: (s) => s.staffProfile?.department?.code ?? "—" },
    { id: "designation", header: "Designation", hideOnMobile: true, cell: (s) => s.staffProfile?.designation ?? "—" },
    {
      id: "status",
      header: "Status",
      cell: (s) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {s.staffProfile ? <StatusBadge status={s.staffProfile.status} /> : <Badge variant="secondary">No profile</Badge>}
          {!s.isActive && <Badge variant="destructive">Login off</Badge>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput key={searchKey} onSearch={setSearch} placeholder="Name, employee ID, CNIC or username" label="Search staff" className="sm:max-w-sm" />
        {!fixedRole && (
          <Select
            aria-label="Filter by role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as RoleName | "");
              setPage(1);
            }}
            className="sm:w-48"
          >
            <option value="">All roles</option>
            {ROLE_FILTERS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        )}
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StaffStatus | "");
            setPage(1);
          }}
          className="sm:w-40"
        >
          <option value="">All statuses</option>
          {STAFF_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by department"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className="sm:w-52"
          disabled={departments.isLoading || departments.isError}
        >
          <option value="">All departments</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <FilterX aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>
      <DataTable
        caption="Staff"
        columns={columns}
        data={q.data?.data}
        getRowId={(s) => s.id}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        isError={q.isError}
        error={q.error}
        onRetry={() => q.refetch()}
        onRowClick={linkRows ? (s) => router.push(`${basePath}/staff/${s.id}`) : undefined}
        empty={{ icon: Users, title: filtersActive ? "No staff match these filters" : "No staff yet", description: filtersActive ? "Try a different search or clear the filters." : undefined }}
        pagination={q.data && { ...q.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }}
      />
    </>
  );
}
