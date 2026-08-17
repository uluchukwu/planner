import { renderToBuffer } from "@react-pdf/renderer";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getOrCreateDay } from "@/lib/planner/days";
import { formatDateLong } from "@/lib/date/week";
import { formatMinutesLabel } from "@/lib/planner/timeblocks";
import { DailyPlannerPdf, DailyPdfData } from "@/lib/pdf/DailyPlannerPdf";
import { TaskPriority } from "@/generated/prisma/enums";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

const QUADRANTS: TaskPriority[] = [
  "URGENT_IMPORTANT",
  "NOT_URGENT_IMPORTANT",
  "URGENT_NOT_IMPORTANT",
  "NOT_URGENT_NOT_IMPORTANT",
];

// Route Handlers sit outside the (app) layout tree, so they don't inherit its auth
// check for free — every export route re-verifies the session itself, same as every
// Server Action does, rather than relying on the page-only layout.tsx gate.
export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateKey(date)) notFound();

  const user = await getCurrentUser();
  const day = await getOrCreateDay(user.id, date, user.weekStartsOn);

  const [tasks, blocks] = await Promise.all([
    db.task.findMany({ where: { userId: user.id, dayId: day.id, status: { not: "ARCHIVED" } }, orderBy: { sortOrder: "asc" } }),
    db.timeBlock.findMany({ where: { dayId: day.id }, orderBy: { startMinutes: "asc" } }),
  ]);

  const quadrants = Object.fromEntries(
    QUADRANTS.map((q) => [q, tasks.filter((t) => t.priority === q).map((t) => ({ title: t.title, done: t.status === "COMPLETED" }))])
  ) as DailyPdfData["quadrants"];

  const top3 = tasks
    .filter((t) => t.dailyPriorityRank !== null)
    .sort((a, b) => (a.dailyPriorityRank ?? 0) - (b.dailyPriorityRank ?? 0))
    .map((t) => ({ title: t.title, done: t.status === "COMPLETED" }));

  const otherTasks = tasks
    .filter((t) => t.dailyPriorityRank === null)
    .map((t) => ({ title: t.title, done: t.status === "COMPLETED" }));

  const data: DailyPdfData = {
    dateLabel: formatDateLong(date),
    challenge: day.challenge,
    objective: day.objective,
    quadrants,
    timeline: blocks.map((b) => ({ label: formatMinutesLabel(b.startMinutes), title: b.title })),
    top3,
    otherTasks,
  };

  const buffer = await renderToBuffer(DailyPlannerPdf({ data }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="planner-day-${date}.pdf"`,
    },
  });
}
