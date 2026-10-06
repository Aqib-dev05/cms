import { z } from "zod";
import { cnicSchema } from "./common.validators";

export const createStudentSchema = z.object({
  username:      z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  email:         z.string().email(),
  password:      z.string().min(8),
  firstName:     z.string().min(1).max(50),
  lastName:      z.string().min(1).max(50),
  fatherName:    z.string().max(100).optional(),
  gender:        z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth:   z.string().optional(),
  cnic:          cnicSchema.optional(),
  phone:         z.string().max(20).optional(),
  personalEmail: z.string().email().optional(),
  address:       z.string().max(255).optional(),
  programId:     z.string().uuid(),
  enrollmentDate: z.string(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
