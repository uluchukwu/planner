import { db } from "@/lib/db";
import { getOrCreateDay } from "@/lib/planner/days";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { todayKey, formatMonthDay } from "@/lib/date/week";
import { computeGoalProgress, computeCompletionRate } from "@/lib/progress";
import { computeCurrentStreak } from "@/lib/habits";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const today = todayKey();
  const monthKey = today.slice(0, 7);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const day = await getOrCreateDay(userId, today, user.weekStartsOn);
  const week = await getOrCreateWeek(userId, today, user.weekStartsOn);

  const [todaysTasks, weekTasks, weekGoals, monthGoals, habits] = await Promise.all([
    db.task.findMany({ where: { userId, dayId: day.id, status: { not: "ARCHIVED" } }, orderBy: { sortOrder: "asc" } }),
    db.task.findMany({ where: { userId, weekId: week.id, status: { not: "ARCHIVED" } } }),
    db.goal.findMany({
      where: { userId, weekId: week.id },
      include: { tasks: { select: { status: true } } },
      orderBy: [{ weeklyPriorityRank: "asc" }, { createdAt: "asc" }],
    }),
    db.goal.findMany({
      where: { userId, level: "MONTH", monthKey },
      include: { tasks: { select: { status: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.habit.findMany({ where: { userId, archived: false }, include: { completions: { select: { date: true } } } }),
  ]);

  const todaysCompleted = todaysTasks.filter((t) => t.status === "COMPLETED").length;
  const weekCompleted = weekTasks.filter((t) => t.status === "COMPLETED").length;
  const weekGoalsWithProgress = weekGoals.map((g) => ({ id: g.id, title: g.title, progress: computeGoalProgress(g) }));
  const monthGoalsWithProgress = monthGoals.map((g) => ({ id: g.id, title: g.title, progress: computeGoalProgress(g) }));
  const bestStreak = habits.reduce((max, h) => Math.max(max, computeCurrentStreak(new Set(h.completions.map((c) => c.date)), today)), 0);

  return jsonResponse({
    dateLabel: formatMonthDay(today),
    today: {
      total: todaysTasks.length,
      completed: todaysCompleted,
      progress: computeCompletionRate(todaysTasks.length, todaysCompleted),
    },
    week: {
      total: weekTasks.length,
      completed: weekCompleted,
      completionRate: computeCompletionRate(weekTasks.length, weekCompleted),
      goals: weekGoalsWithProgress,
    },
    month: {
      goals: monthGoalsWithProgress,
    },
    bestHabitStreak: bestStreak,
  });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
