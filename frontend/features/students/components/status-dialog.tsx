"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { humanize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useUpdateStudentStatus } from "../hooks";
import { SETTABLE_STATUSES, type SettableStatus, type StudentStatus } from "../types";

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  current: StudentStatus;
}

const NOTES: Partial<Record<SettableStatus, string>> = {
  SUSPENDED: "This also disables the student's login until they are set back to Active.",
  EXPELLED: "This also disables the student's login until they are set back to Active.",
  ACTIVE: "This re-enables the student's login.",
};

export function StatusDialog({ open, onOpenChange, studentId, studentName, current }: StatusDialogProps) {
  const options = SETTABLE_STATUSES.filter((s) => s !== current);
  const [next, setNext] = useState<SettableStatus>(options[0]);
  const mutation = useUpdateStudentStatus(studentId);

  const confirm = () =>
    mutation.mutate(next, {
      onSuccess: () => {
        toast.success(`${studentName} is now ${humanize(next)}`);
        onOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });

  return (
    <AlertDialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change status</AlertDialogTitle>
          <AlertDialogDescription>
            {studentName} is currently <strong>{humanize(current)}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="new-status">New status</Label>
          <Select id="new-status" value={next} onChange={(e) => setNext(e.target.value as SettableStatus)}>
            {options.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
          {NOTES[next] && <p className="text-sm text-muted-foreground">{NOTES[next]}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button variant={next === "EXPELLED" || next === "SUSPENDED" ? "destructive" : "default"} onClick={confirm} loading={mutation.isPending}>
            Update status
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
