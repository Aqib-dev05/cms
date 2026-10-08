import { z } from "zod";
import { cnicSchema } from "@/lib/validators";

/**
 * Form-level schema for "Add student". Mirrors the backend's createStudentSchema,
 * with friendly messages. Blank optional inputs are turned into `undefined`
 * first (see `stripBlanks`) — otherwise "" would fail the CNIC/email/enum checks.
 */
export const studentFormSchema = z.object({
  username: z
    .string({ required_error: "Required" })
    .min(3, "At least 3 characters")
    .max(30, "At most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only"),
  email: z.string({ required_error: "Required" }).email("Enter a valid email address"),
  password: z.string({ required_error: "Required" }).min(8, "At least 8 characters"),
  firstName: z.string({ required_error: "Required" }).trim().min(1, "Required").max(50, "At most 50 characters"),
  lastName: z.string({ required_error: "Required" }).trim().min(1, "Required").max(50, "At most 50 characters"),
  fatherName: z.string().trim().max(100, "At most 100 characters").optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  cnic: cnicSchema.optional(),
  phone: z.string().trim().max(20, "At most 20 characters").optional(),
  personalEmail: z.string().email("Enter a valid email address").optional(),
  address: z.string().trim().max(255, "At most 255 characters").optional(),
  programId: z.string({ required_error: "Choose a program" }).uuid("Choose a program"),
  enrollmentDate: z.string({ required_error: "Required" }).min(1, "Required"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

/** "" → undefined, for every key. */
export function stripBlanks<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? undefined : v])) as T;
}

type FieldError = { field: keyof StudentFormValues; message: string };

/** Turn the backend's 409 messages into an error on the right field (null → show as a general error). */
export function mapServerError(message: string): FieldError | null {
  if (/username/i.test(message)) return { field: "username", message };
  if (/email/i.test(message)) return { field: "email", message };
  if (/cnic/i.test(message)) return { field: "cnic", message };
  return null;
}
