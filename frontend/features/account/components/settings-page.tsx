"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
import { useZodForm } from "@/lib/form";
import { changePasswordSchema } from "@/lib/validators";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { PasswordField } from "@/components/shared/password-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch } from "@/store/hooks";
import { clearAuth } from "@/store/slices/auth.slice";
import { useAppMutation } from "@/hooks/use-app-mutation";

const schema = changePasswordSchema
  .extend({ confirm: z.string().min(1, "Confirm your new password") })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a password you haven't used for this account" });

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const change = useAppMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) => api.post("/auth/change-password", v),
    toastError: false,
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useZodForm(schema, { currentPassword: "", newPassword: "", confirm: "" });

  const submit = handleSubmit((v) =>
    change.mutate(
      { currentPassword: v.currentPassword, newPassword: v.newPassword },
      {
        onSuccess: () => {
          // the server ends every session when the password changes
          toast.success("Password changed. Please sign in with your new password.");
          disconnectSocket();
          dispatch(clearAuth());
          queryClient.clear();
          router.replace("/login");
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          if (/current/i.test(msg)) setError("currentPassword", { message: msg });
          else toast.error(msg);
        },
      }
    )
  );

  return (
    <>
      <PageHeader title="Settings" description="Account security." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>You'll be signed out on every device afterwards.</CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={submit} className="space-y-4">
            <FormField id="cp-current" label="Current password" required error={errors.currentPassword?.message}>
              <PasswordField autoComplete="current-password" {...register("currentPassword")} />
            </FormField>
            <FormField id="cp-new" label="New password" required description="8+ characters with an uppercase letter and a number" error={errors.newPassword?.message}>
              <PasswordField {...register("newPassword")} />
            </FormField>
            <FormField id="cp-confirm" label="Confirm new password" required error={errors.confirm?.message}>
              <PasswordField {...register("confirm")} />
            </FormField>
            <div className="flex justify-end"><Button type="submit" loading={change.isPending}>Change password</Button></div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
