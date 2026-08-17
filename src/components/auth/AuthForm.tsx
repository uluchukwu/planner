"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { AuthFormState } from "@/lib/actions/auth";

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="w-full max-w-sm">
      <p className="text-sm font-semibold tracking-tight text-ink mb-1">Planner</p>
      <h1 className="text-xl font-semibold text-ink mb-1">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        {mode === "login" ? "Plan the week. Focus today." : "Your personal command centre starts here."}
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        {mode === "signup" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" type="text" autoComplete="name" required />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
        </div>

        {state?.error && (
          <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{state.error}</p>
        )}

        <Button type="submit" variant="primary" disabled={pending} className="mt-1 justify-center">
          {pending ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </Button>
      </form>

      <p className="text-sm text-ink-soft mt-6">
        {mode === "login" ? (
          <>Don&apos;t have an account? <Link href="/signup" className="text-accent-strong font-medium">Sign up</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="text-accent-strong font-medium">Log in</Link></>
        )}
      </p>
    </div>
  );
}
