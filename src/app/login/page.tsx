import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { login } from "@/lib/actions/auth";
import { getOptionalUser } from "@/lib/auth/dal";

export default async function LoginPage() {
  const user = await getOptionalUser();
  if (user) redirect("/today");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm mode="login" action={login} />
    </div>
  );
}
