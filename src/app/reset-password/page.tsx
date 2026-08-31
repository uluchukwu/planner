import { redirect } from "next/navigation";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getOptionalUser } from "@/lib/auth/dal";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const user = await getOptionalUser();
  if (user) redirect("/today");

  const { token } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="w-full max-w-sm">
          <p className="text-sm font-semibold tracking-tight text-ink mb-1">Planner</p>
          <h1 className="text-xl font-semibold text-ink mb-1">Missing reset link</h1>
          <p className="text-sm text-ink-soft mb-6">
            This page needs a reset token from the link in your email.{" "}
            <Link href="/forgot-password" className="text-accent-strong font-medium">Request a new one</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
