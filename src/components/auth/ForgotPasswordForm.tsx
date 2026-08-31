"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { requestPasswordReset } from "@/lib/actions/passwordReset";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="w-full max-w-sm">
      <p className="text-sm font-semibold tracking-tight text-ink mb-1">Planner</p>
      <h1 className="text-xl font-semibold text-ink mb-1">Reset your password</h1>
      <p className="text-sm text-ink-soft mb-6">Enter your email and we&apos;ll send you a link to reset it.</p>

      {state?.success ? (
        <p className="text-sm text-accent-strong bg-accent-soft rounded-lg px-3 py-2">{state.success}</p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          {state?.error && (
            <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{state.error}</p>
          )}

          <Button type="submit" variant="primary" disabled={pending} className="mt-1 justify-center">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-sm text-ink-soft mt-6">
        <Link href="/login" className="text-accent-strong font-medium">Back to log in</Link>
      </p>
    </div>
  );
}
