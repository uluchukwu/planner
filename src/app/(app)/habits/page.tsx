import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { todayKey, getWeekDays, daysElapsedInMonth } from "@/lib/date/week";
import { computeCurrentStreak, countCompletionsInRange } from "@/lib/habits";
import { HabitManageList, HabitManageRow } from "@/components/habits/HabitManageList";

export default async function HabitsPage() {
  const user = await getCurrentUser();
  const today = todayKey();
  const weekDateKeys = getWeekDays(today, user.weekStartsOn);
  const monthDateKeys = daysElapsedInMonth(today);

  const habits = await db.habit.findMany({
    where: { userId: user.id },
    include: { completions: { select: { date: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows: HabitManageRow[] = habits.map((h) => {
    const dates = new Set(h.completions.map((c) => c.date));
    return {
      id: h.id,
      name: h.name,
      archived: h.archived,
      currentStreak: computeCurrentStreak(dates, today),
      weekCompletions: countCompletionsInRange(dates, weekDateKeys),
      monthlyCompletionPct: Math.round((countCompletionsInRange(dates, monthDateKeys) / monthDateKeys.length) * 100),
    };
  });

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-xl font-semibold text-ink tracking-tight mb-1">Habits</h1>
      <p className="text-sm text-ink-soft mb-6">One-click completion, tracked from the week view too.</p>
      <HabitManageList initialHabits={rows} />
    </div>
  );
}
