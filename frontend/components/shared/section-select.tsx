"use client";

import { useSections } from "@/features/academic/hooks";
import { sectionLabel, type Section } from "@/features/academic/types";
import { Select, type SelectProps } from "@/components/ui/select";

interface SectionSelectProps extends Omit<SelectProps, "value" | "onChange"> {
  value: string;
  onChange: (sectionId: string, section?: Section) => void;
  /** restrict to a teacher's sections (staffProfile id) */
  teacherId?: string;
  /** only sections of semesters that are currently active */
  activeOnly?: boolean;
  /** pass the list yourself to skip the fetch (e.g. from a workload query) */
  sections?: Section[];
  placeholder?: string;
}

/** Native select of course sections: "CS101 · A — Sem 3 Fall". */
export function SectionSelect({ value, onChange, teacherId, activeOnly = true, sections, placeholder = "Select a section", ...rest }: SectionSelectProps) {
  const q = useSections(teacherId ? { teacherId } : {}, !sections);
  const all = sections ?? q.data ?? [];
  const list = activeOnly ? all.filter((s) => s.semester.isActive) : all;
  return (
    <Select {...rest} value={value} onChange={(e) => onChange(e.target.value, list.find((s) => s.id === e.target.value))} disabled={rest.disabled || (!sections && q.isLoading)}>
      <option value="">{!sections && q.isLoading ? "Loading sections…" : list.length ? placeholder : "No sections available"}</option>
      {list.map((s) => (
        <option key={s.id} value={s.id}>
          {sectionLabel(s)}
        </option>
      ))}
    </Select>
  );
}
