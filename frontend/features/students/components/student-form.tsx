"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Dices, Eye, EyeOff, TriangleAlert } from "lucide-react";
import type { Program } from "@/features/academic/types";
import { generatePassword } from "@/lib/password";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { studentFormSchema, stripBlanks, type StudentFormValues } from "../schema";

const resolver: Resolver<StudentFormValues> = (values, context, options) =>
  zodResolver(studentFormSchema)(stripBlanks(values), context, options);

interface StudentFormProps {
  programs: Program[];
  programsLoading?: boolean;
  onSubmit: (values: StudentFormValues) => void;
  isSubmitting: boolean;
  /** general error from the server (not tied to one field) */
  serverError?: string | null;
  /** server error that belongs to one field, e.g. "Username already taken" */
  serverFieldError?: { field: keyof StudentFormValues; message: string } | null;
  cancelHref: string;
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

export function StudentForm({ programs, programsLoading, onSubmit, isSubmitting, serverError, serverFieldError, cancelHref }: StudentFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver,
    defaultValues: { programId: "", enrollmentDate: format(new Date(), "yyyy-MM-dd") },
  });

  useEffect(() => {
    if (serverFieldError) setError(serverFieldError.field, { message: serverFieldError.message }, { shouldFocus: true });
  }, [serverFieldError, setError]);

  // Suggest a username from the name, only while the username box is still empty.
  const suggestUsername = () => {
    const { firstName, lastName, username } = getValues();
    if (username || !firstName || !lastName) return;
    const slug = `${firstName}_${lastName}`.toLowerCase().replace(/[^a-z0-9_]+/g, "").slice(0, 30);
    setValue("username", slug, { shouldValidate: true });
  };

  const fillPassword = () => {
    setValue("password", generatePassword(), { shouldValidate: true });
    setShowPassword(true); // so the admin can read it out / copy it
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <FormSection title="Personal information">
        <FormField id="firstName" label="First name" required error={errors.firstName?.message}>
          <Input autoComplete="off" {...register("firstName")} />
        </FormField>
        <FormField id="lastName" label="Last name" required error={errors.lastName?.message}>
          <Input autoComplete="off" {...register("lastName", { onBlur: suggestUsername })} />
        </FormField>
        <FormField id="fatherName" label="Father's name" error={errors.fatherName?.message}>
          <Input autoComplete="off" {...register("fatherName")} />
        </FormField>
        <FormField id="gender" label="Gender" error={errors.gender?.message}>
          <Select {...register("gender")}>
            <option value="">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
        </FormField>
        <FormField id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth?.message}>
          <Input type="date" max={format(new Date(), "yyyy-MM-dd")} {...register("dateOfBirth")} />
        </FormField>
        <FormField id="cnic" label="CNIC" description="Format: 12345-1234567-1" error={errors.cnic?.message}>
          <Input inputMode="numeric" placeholder="12345-1234567-1" autoComplete="off" {...register("cnic")} />
        </FormField>
        <FormField id="phone" label="Phone" error={errors.phone?.message}>
          <Input type="tel" autoComplete="off" {...register("phone")} />
        </FormField>
        <FormField id="personalEmail" label="Personal email" error={errors.personalEmail?.message}>
          <Input type="email" autoComplete="off" {...register("personalEmail")} />
        </FormField>
        <FormField id="address" label="Address" error={errors.address?.message} className="sm:col-span-2">
          <Textarea autoComplete="off" {...register("address")} />
        </FormField>
      </FormSection>

      <FormSection title="Academic" description="The registration number is generated automatically from the program.">
        <FormField id="programId" label="Program" required error={errors.programId?.message}>
          <Select disabled={programsLoading} {...register("programId")}>
            <option value="">{programsLoading ? "Loading programs…" : "Select a program"}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="enrollmentDate" label="Enrollment date" required error={errors.enrollmentDate?.message}>
          <Input type="date" {...register("enrollmentDate")} />
        </FormField>
      </FormSection>

      <FormSection title="Login account" description="The student signs in with these. Ask them to change the password after first login.">
        <FormField id="username" label="Username" required description="Lowercase letters, numbers and underscores" error={errors.username?.message}>
          <Input autoComplete="off" autoCapitalize="none" spellCheck={false} {...register("username")} />
        </FormField>
        <FormField id="email" label="Login email" required error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...register("email")} />
        </FormField>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="password">
            Initial password
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-11"
                aria-required
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <Button type="button" variant="outline" onClick={fillPassword}>
              <Dices aria-hidden="true" /> Generate
            </Button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create student"}
        </Button>
      </div>
    </form>
  );
}
