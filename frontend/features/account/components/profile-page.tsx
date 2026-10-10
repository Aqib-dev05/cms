"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyProfile } from "@/features/students/api";
import { fetchStaffMember } from "@/features/staff/api";
import { formatDate, humanize } from "@/lib/format";
import { useRole } from "@/hooks/use-role";
import { DetailList } from "@/components/shared/detail-list";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/auth.slice";

export function ProfilePage() {
  const user = useAppSelector(selectUser);
  const { role, userId } = useRole();
  const isStudent = role === "STUDENT";
  const student = useQuery({ queryKey: ["students", "me"], queryFn: fetchMyProfile, enabled: isStudent });
  // Not every staff role may read /staff/:id — a 403 just means we show the account card only.
  const staff = useQuery({ queryKey: ["staff", "detail", userId ?? ""], queryFn: () => fetchStaffMember(userId as string), enabled: !isStudent && !!userId, retry: false });
  if (!user) return null;

  const p = student.data?.studentProfile;
  const s = staff.data?.staffProfile;
  const name = p ? `${p.firstName} ${p.lastName}` : s ? `${s.firstName} ${s.lastName}` : user.username;

  return (
    <>
      <PageHeader title="My profile" description="Your account and personal details. Contact the administration to change them." />
      <div className="mb-6 flex items-center gap-4">
        <Avatar className="h-14 w-14"><AvatarFallback className="text-lg">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
        <div>
          <p className="font-heading text-xl font-semibold">{name}</p>
          <Badge variant="secondary" className="mt-1">{user.role.displayName}</Badge>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent>
            <DetailList items={[{ label: "Username", value: user.username }, { label: "Login email", value: user.email }, { label: "College email", value: user.collegeEmail }, { label: "Role", value: user.role.displayName }]} />
          </CardContent>
        </Card>
        {isStudent && (
          <Card>
            <CardHeader><CardTitle className="text-base">Student details</CardTitle></CardHeader>
            <CardContent>
              {student.isLoading ? <Skeleton className="h-40" /> : p ? (
                <DetailList items={[
                  { label: "Registration no.", value: p.registrationNo },
                  { label: "Program", value: `${p.program.name} (${p.program.code})` },
                  { label: "Department", value: p.program.department.name },
                  { label: "Current semester", value: p.currentSemester },
                  { label: "Enrolled on", value: formatDate(p.enrollmentDate) },
                  { label: "Father's name", value: p.fatherName },
                  { label: "Phone", value: p.phone },
                  { label: "CNIC", value: p.cnic },
                  { label: "Address", value: p.address },
                ]} />
              ) : <p className="text-sm text-muted-foreground">Details aren't available right now.</p>}
            </CardContent>
          </Card>
        )}
        {!isStudent && s && (
          <Card>
            <CardHeader><CardTitle className="text-base">Employment</CardTitle></CardHeader>
            <CardContent>
              <DetailList items={[
                { label: "Employee ID", value: s.employeeId },
                { label: "Designation", value: s.designation },
                { label: "Department", value: s.department?.name },
                { label: "Qualification", value: s.qualification },
                { label: "Joined", value: formatDate(s.joiningDate) },
                { label: "Status", value: humanize(s.status) },
                { label: "Phone", value: s.phone },
                { label: "CNIC", value: s.cnic },
              ]} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
