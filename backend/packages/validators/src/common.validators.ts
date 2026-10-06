import { z } from "zod";

export const paginationSchema = z.object({
  page:  z.string().default("1"),
  limit: z.string().default("20"),
});

export const uuidSchema = z.string().uuid("Invalid ID format");

export const dateSchema = z.string().transform((v) => new Date(v));

export const cnicSchema = z
  .string()
  .regex(/^\d{5}-\d{7}-\d$/, "CNIC format: 12345-1234567-1");
