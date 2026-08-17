import { redirect } from "next/navigation";
import { todayKey } from "@/lib/date/week";

export default function TodayRedirectPage() {
  redirect(`/day/${todayKey()}`);
}
