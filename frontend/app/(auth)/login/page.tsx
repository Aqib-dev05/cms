"use client";

import { BookOpenCheck, Receipt, BellRing } from "lucide-react";
import { siteConfig } from "@/config/site";
import { GuestGuard } from "@/components/auth/guest-guard";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HIGHLIGHTS = [
  { icon: BookOpenCheck, text: "Attendance, exams and results in one place" },
  { icon: Receipt, text: "Fee invoices, payments and receipts" },
  { icon: BellRing, text: "Notices and live notifications" },
];

export default function LoginPage() {
  return (
    <GuestGuard>
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
          <div className="flex items-center gap-3 font-heading text-xl font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            {siteConfig.name}
          </div>
          <div className="relative z-10 max-w-md space-y-8">
            <h2 className="font-heading text-4xl font-semibold leading-tight">Everything your college runs on, in one place.</h2>
            <ul className="space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-primary-foreground/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-24 h-40 w-40 rounded-full bg-primary-foreground/10" />
        </aside>

        <main className="relative flex items-center justify-center p-6">
          <div className="absolute right-4 top-4">
            <ThemeToggle />
          </div>
          <div className="w-full max-w-md space-y-6">
            <Logo href="/login" className="lg:hidden" />
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Sign in</CardTitle>
                <CardDescription>Use the username or email your college gave you.</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>
            <p className="text-center text-sm text-muted-foreground">Forgot your password? Ask the administration office to reset it.</p>
          </div>
        </main>
      </div>
    </GuestGuard>
  );
}
