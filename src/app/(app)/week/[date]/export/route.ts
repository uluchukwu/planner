import { renderToBuffer } from "@react-pdf/renderer";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getOrCreateDay } from "@/lib/planner/days";
import { getOrCreateWeeklyChecklist } from "@/lib/planner/checklists";
import { getWeekDays, formatWeekRange, formatDateShort, weekdayOf, WEEKDAY_LABELS } from "@/lib/date/week";
import { computeGoalProgress } from "@/lib/progress";
import { WeeklyPlannerPdf, WeeklyPdfData } from "@/lib/pdf/WeeklyPlannerPdf";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateKey(date)) notFound();

  const user = await getCurrentUser();
  const week = await getOrCreateWeek(user.id, date, user.weekStartsOn);
  const dateKeys = getWeekDays(date, user.weekStartsOn);
  const days = await Promise.all(dateKeys.map((key) => getOrCreateDay(user.id, key, user.weekStartsOn)));

  const [tasks, weekGoals, habits, checklist] = await Promise.all([
    db.task.findMany({ where: { userId: user.id, weekId: week.id, status: { not: "ARCHIVED" }, dayId: { not: null } }, orderBy: { sortOrder: "asc" } }),
    db.goal.findMany({
      where: { userId: user.id, weekId: week.id, weeklyPriorityRank: { not: null } },
      include: { tasks: { select: { status: true } } },
      orderBy: { weeklyPriorityRank: "asc" },
    }),
    db.habit.findMany({ where: { userId: user.id, archived: false }, include: { completions: { select: { date: true } } }, orderBy: { createdAt: "asc" } }),
    getOrCreateWeeklyChecklist(user.id, week.id),
  ]);

  const data: WeeklyPdfData = {
    weekLabel: formatWeekRange(dateKeys[0], dateKeys[6]),
    priorityGoals: weekGoals.map((g) => ({ rank: g.weeklyPriorityRank!, title: g.title, progress: computeGoalProgress(g) })),
    days: days.map((day, i) => ({
      label: WEEKDAY_LABELS[weekdayOf(dateKeys[i])],
      sublabel: formatDateShort(dateKeys[i]),
      tasks: tasks.filter((t) => t.dayId === day.id).map((t) => ({ title: t.title, done: t.status === "COMPLETED" })),
    })),
    checklist: checklist.items.map((i) => ({ label: i.label, done: i.completed })),
    habits: habits.map((h) => {
      const completionDates = new Set(h.completions.map((c) => c.date));
      return { name: h.name, weekDots: dateKeys.map((key) => completionDates.has(key)) };
    }),
  };

  const buffer = await renderToBuffer(WeeklyPlannerPdf({ data }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="planner-week-${dateKeys[0]}.pdf"`,
    },
  });
}
