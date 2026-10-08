"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilterX, GraduationCap, Plus } from "lucide-react";
import { usePrograms } from "@/features/academic/hooks";
import { usePageState } from "@/hooks/use-page-state";
import { humanize } from "@/lib/format";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useStudents } from "../hooks";
import { STUDENT_STATUSES, type StudentStatus } from "../types";
import { getStudentColumns } from "./students-columns";

interface StudentsListPageProps {
  /** role area the page lives in, e.g. "/admin" */
  basePath: string;
  canCreate?: boolean;
}

export function StudentsListPage({ basePath, canCreate = false }: StudentsListPageProps) {
  const router = useRouter();
  const { page, limit, params, setPage, setLimit, setSearch } = usePageState(20);
  const [status, setStatusState] = useState<StudentStatus | "">("");
  const [programId, setProgramIdState] = useState("");
  const [searchKey, setSearchKey] = useState(0); // remounts SearchInput to clear its text

  const programs = usePrograms();
  const students = useStudents({ ...params, status: status || undefined, programId: programId || undefined });

  const filtersActive = !!(status || programId || params.search);

  const clearFilters = () => {
    setStatusState("");
    setProgramIdState("");
    setSearch("");
    setSearchKey((k) => k + 1);
  };

  return (
    <>
      <PageHeader
        title="Students"
        description="Search, filter and manage student records."
        actions={
          canCreate && (
            <Button asChild>
              <Link href={`${basePath}/students/new`}>
                <Plus aria-hidden="true" /> Add student
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput key={searchKey} onSearch={setSearch} placeholder="Name, reg. no, CNIC or username" label="Search students" className="sm:max-w-sm" />
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatusState(e.target.value as StudentStatus | "");
            setPage(1);
          }}
          className="sm:w-44"
        >
          <option value="">All statuses</option>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by program"
          value={programId}
          onChange={(e) => {
            setProgramIdState(e.target.value);
            setPage(1);
          }}
          className="sm:w-56"
          disabled={programs.isLoading}
        >
          <option value="">All programs</option>
          {programs.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterX aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>

      <DataTable
        caption="Students"
        columns={getStudentColumns(basePath)}
        data={students.data?.data}
        getRowId={(s) => s.id}
        isLoading={students.isLoading}
        isFetching={students.isFetching}
        isError={students.isError}
        error={students.error}
        onRetry={() => students.refetch()}
        onRowClick={(s) => router.push(`${basePath}/students/${s.id}`)}
        empty={{
          icon: GraduationCap,
          title: filtersActive ? "No students match these filters" : "No students yet",
          description: filtersActive ? "Try a different search or clear the filters." : canCreate ? "Add the first student to get started." : undefined,
          action: filtersActive ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined,
        }}
        pagination={students.data && { ...students.data.meta, page, limit, onPageChange: setPage, onLimitChange: setLimit }}
      />
    </>
  );
}
