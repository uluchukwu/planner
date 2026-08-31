"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { resetPassword } from "@/lib/actions/passwordReset";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, undefined);

  return (
    <div className="w-full max-w-sm">
      <p className="text-sm font-semibold tracking-tight text-ink mb-1">Planner</p>
      <h1 className="text-xl font-semibold text-ink mb-1">Choose a new password</h1>
      <p className="text-sm text-ink-soft mb-6">This link can only be used once, and expires 30 minutes after it was sent.</p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>

        {state?.error && (
          <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{state.error}</p>
        )}

        <Button type="submit" variant="primary" disabled={pending} className="mt-1 justify-center">
          {pending ? "Saving…" : "Reset password"}
        </Button>
      </form>

      <p className="text-sm text-ink-soft mt-6">
        <Link href="/login" className="text-accent-strong font-medium">Back to log in</Link>
      </p>
    </div>
  );
}
