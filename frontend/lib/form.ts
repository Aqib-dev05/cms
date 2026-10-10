import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type DefaultValues } from "react-hook-form";
import { z } from "zod";

/** `useForm` wired to a zod schema, with correct input/output types (coerced numbers, optional blanks…). */
export function useZodForm<S extends z.ZodTypeAny>(schema: S, defaultValues?: DefaultValues<z.input<S>>) {
  return useForm<z.input<S>, unknown, z.output<S>>({ resolver: zodResolver(schema), defaultValues });
}

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Required text. */
export const reqText = (max = 255, message = "Required") => z.string({ required_error: message }).trim().min(1, message).max(max, `At most ${max} characters`);
/** Optional text — blank becomes `undefined` (so the API never receives ""). */
export const optText = (max = 255) => z.preprocess(blankToUndefined, z.string().trim().max(max, `At most ${max} characters`).optional());
/** Required whole number, input as text. */
export const reqInt = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number({ invalid_type_error: "Enter a number" }).int("Whole numbers only").min(min, `At least ${min}`).max(max, `At most ${max}`));
export const optInt = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number({ invalid_type_error: "Enter a number" }).int("Whole numbers only").min(min, `At least ${min}`).max(max, `At most ${max}`).optional());
/** Required number (decimals allowed), > 0 by default. */
export const reqNumber = (min = 0, minExclusive = true) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ invalid_type_error: "Enter a number" }).refine((n) => (minExclusive ? n > min : n >= min), minExclusive ? `Must be greater than ${min}` : `Must be at least ${min}`)
  );
export const reqDate = z.string({ required_error: "Required" }).min(1, "Required");
export const optDate = z.preprocess(blankToUndefined, z.string().optional());
export const reqId = (message = "Required") => z.string({ required_error: message }).uuid(message);
export const optId = z.preprocess(blankToUndefined, z.string().uuid().optional());
export const optEnum = <T extends readonly [string, ...string[]]>(values: T) => z.preprocess(blankToUndefined, z.enum(values).optional());
