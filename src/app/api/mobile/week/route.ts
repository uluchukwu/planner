import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getOrCreateDay } from "@/lib/planner/days";
import { getOrCreateWeeklyChecklist } from "@/lib/planner/checklists";
import { getWeekDays, formatWeekRange, formatDateShort, weekdayOf, WEEKDAY_LABELS, todayKey } from "@/lib/date/week";
import { computeGoalProgress } from "@/lib/progress";
import { computeCurrentStreak } from "@/lib/habits";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isValidDateKey(dateParam) ? dateParam : todayKey();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const week = await getOrCreateWeek(userId, date, user.weekStartsOn);
  const dateKeys = getWeekDays(date, user.weekStartsOn);
  const days = await Promise.all(dateKeys.map((key) => getOrCreateDay(userId, key, user.weekStartsOn)));

  const [tasks, weekGoals, rawHabits, checklist] = await Promise.all([
    db.task.findMany({ where: { userId, weekId: week.id, status: { not: "ARCHIVED" } } }),
    db.goal.findMany({
      where: { userId, weekId: week.id },
      include: { tasks: { select: { status: true } } },
      orderBy: [{ weeklyPriorityRank: "asc" }, { createdAt: "asc" }],
    }),
    db.habit.findMany({ where: { userId, archived: false }, include: { completions: { select: { date: true } } }, orderBy: { createdAt: "asc" } }),
    getOrCreateWeeklyChecklist(userId, week.id),
  ]);

  return jsonResponse({
    weekId: week.id,
    weekLabel: formatWeekRange(dateKeys[0], dateKeys[6]),
    isCurrentWeek: dateKeys.includes(todayKey()),
    goals: weekGoals.map((g) => ({
      id: g.id,
      title: g.title,
      weeklyPriorityRank: g.weeklyPriorityRank,
      progress: computeGoalProgress(g),
    })),
    days: days.map((day, i) => {
      const dayTasks = tasks.filter((t) => t.dayId === day.id);
      return {
        date: dateKeys[i],
        label: WEEKDAY_LABELS[weekdayOf(dateKeys[i])],
        sublabel: formatDateShort(dateKeys[i]),
        isToday: dateKeys[i] === todayKey(),
        taskCount: dayTasks.length,
        completedCount: dayTasks.filter((t) => t.status === "COMPLETED").length,
      };
    }),
    habits: rawHabits.map((h) => {
      const completionDates = new Set(h.completions.map((c) => c.date));
      return {
        id: h.id,
        name: h.name,
        weekDots: dateKeys.map((key) => completionDates.has(key)),
        currentStreak: computeCurrentStreak(completionDates, todayKey()),
      };
    }),
    checklist: {
      id: checklist.id,
      items: checklist.items.map((i) => ({ id: i.id, label: i.label, completed: i.completed })),
    },
  });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
