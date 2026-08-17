import { redirect } from "next/navigation";
import { todayKey } from "@/lib/date/week";

export default function WeekRedirectPage() {
  redirect(`/week/${todayKey()}`);
}
