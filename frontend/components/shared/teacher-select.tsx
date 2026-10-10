"use client";

import { useStaffList } from "@/features/staff/hooks";
import { Select, type SelectProps } from "@/components/ui/select";

/** Select of teaching staff (role TEACHER / HOD). Value = staffProfile id. Needs `staff.read`. */
export function TeacherSelect({ value, onChange, ...rest }: Omit<SelectProps, "value" | "onChange"> & { value: string; onChange: (profileId: string) => void }) {
  const teachers = useStaffList({ page: 1, limit: 50, role: "TEACHER", status: "ACTIVE" });
  const hods = useStaffList({ page: 1, limit: 50, role: "HOD", status: "ACTIVE" });
  const loading = teachers.isLoading || hods.isLoading;
  const rows = [...(hods.data?.data ?? []), ...(teachers.data?.data ?? [])].filter((s) => s.staffProfile);
  return (
    <Select {...rest} value={value} onChange={(e) => onChange(e.target.value)} disabled={rest.disabled || loading}>
      <option value="">{loading ? "Loading…" : "Select a teacher"}</option>
      {rows.map((s) => (
        <option key={s.staffProfile!.id} value={s.staffProfile!.id}>
          {s.staffProfile!.firstName} {s.staffProfile!.lastName} ({s.role.displayName}
          {s.staffProfile!.department ? ` · ${s.staffProfile!.department.code}` : ""})
        </option>
      ))}
    </Select>
  );
}
