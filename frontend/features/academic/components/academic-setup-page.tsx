"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoursesTab } from "./courses-tab";
import { DepartmentsTab } from "./departments-tab";
import { ProgramsTab } from "./programs-tab";
import { SectionsTab } from "./sections-tab";
import { SessionsTab } from "./sessions-tab";

/** Admin: the whole academic structure in one place. */
export function AcademicSetupPage() {
  const [tab, setTab] = useState("departments");
  return (
    <>
      <PageHeader title="Academic setup" description="Departments, programs, sessions, courses and sections." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Academic setup sections">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="sessions">Sessions &amp; semesters</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>
        <TabsContent value="departments">
          <DepartmentsTab canManage />
        </TabsContent>
        <TabsContent value="programs">
          <ProgramsTab canManage />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab canManage />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesTab canManage />
        </TabsContent>
        <TabsContent value="sections">
          <SectionsTab canManage />
        </TabsContent>
      </Tabs>
    </>
  );
}
