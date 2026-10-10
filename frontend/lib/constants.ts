export const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

export const dayLabel = (n: number) => DAYS.find((d) => d.value === n)?.label ?? `Day ${n}`;

/** "14:30" → "02:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export const SEMESTER_TYPES = ["FALL", "SPRING", "SUMMER"] as const;
export const EXAM_TYPES = ["MIDTERM", "FINAL", "QUIZ", "ASSIGNMENT", "LAB", "PROJECT", "SESSIONAL"] as const;
export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE"] as const;
