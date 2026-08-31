import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getOptionalUser } from "@/lib/auth/dal";

export default async function ForgotPasswordPage() {
  const user = await getOptionalUser();
  if (user) redirect("/today");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <ForgotPasswordForm />
    </div>
  );
}
