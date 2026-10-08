import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/format";

type Variant = NonNullable<BadgeProps["variant"]>;

/** Maps backend enum values (StudentStatus, FeeStatus, ComplaintStatus, ...) to a badge colour. */
const STATUS_VARIANT: Record<string, Variant> = {
  // good / done
  ACTIVE: "success",
  PAID: "success",
  APPROVED: "success",
  PRESENT: "success",
  RESOLVED: "success",
  AVAILABLE: "success",
  ENROLLED: "success",
  GRADUATED: "success",
  // needs attention
  UNPAID: "warning",
  PARTIAL: "warning",
  LATE: "warning",
  UNDER_REVIEW: "warning",
  IN_PROGRESS: "warning",
  FEE_PENDING: "warning",
  WAITLISTED: "warning",
  ON_LEAVE: "warning",
  RESERVED: "warning",
  UNDER_REPAIR: "warning",
  // bad
  ABSENT: "destructive",
  OVERDUE: "destructive",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
  EXPELLED: "destructive",
  DROPPED_OUT: "destructive",
  LOST: "destructive",
  DAMAGED: "destructive",
  // informational
  SUBMITTED: "info",
  SHORTLISTED: "info",
  ISSUED: "info",
  EXCUSED: "info",
  WAIVED: "info",
  // neutral
  DRAFT: "secondary",
  CLOSED: "secondary",
  RETIRED: "secondary",
  RESIGNED: "secondary",
  ALUMNI: "secondary",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className={className}>
      {humanize(status)}
    </Badge>
  );
}
