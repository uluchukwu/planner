import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/dal";

export default async function RootPage() {
  const user = await getOptionalUser();
  redirect(user ? "/today" : "/login");
}
