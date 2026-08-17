import { redirect } from "next/navigation";
import { todayKey } from "@/lib/date/week";

export default function ExpensesRedirectPage() {
  redirect(`/expenses/${todayKey().slice(0, 7)}`);
}
