"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { useLogin } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  const serverError = login.isError ? getErrorMessage(login.error, "Login failed. Please try again.") : null;

  return (
    <form onSubmit={handleSubmit((values) => login.mutate(values))} className="space-y-5" noValidate>
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">Username or email</Label>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? "username-error" : undefined}
          {...register("username")}
        />
        {errors.username && (
          <p id="username-error" className="text-sm text-destructive">
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            aria-invalid={!!errors.password}
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
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
