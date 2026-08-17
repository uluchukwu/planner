import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getOrCreateDay } from "@/lib/planner/days";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { todayKey, formatMonthDay } from "@/lib/date/week";
import { formatMinutesLabel } from "@/lib/planner/timeblocks";
import { computeGoalProgress, computeCompletionRate } from "@/lib/progress";
import { computeCurrentStreak } from "@/lib/habits";
import { Greeting } from "@/components/dashboard/Greeting";
import { QuickTaskList } from "@/components/dashboard/QuickTaskList";
import { StatTile } from "@/components/dashboard/StatTile";
import { ProgressBar } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const today = todayKey();
  const monthKey = today.slice(0, 7);

  const day = await getOrCreateDay(user.id, today, user.weekStartsOn);
  const week = await getOrCreateWeek(user.id, today, user.weekStartsOn);

  const [todaysTasks, weekTasks, weekGoals, monthGoals, timeBlocks, habits] = await Promise.all([
    db.task.findMany({ where: { userId: user.id, dayId: day.id, status: { not: "ARCHIVED" } }, orderBy: { sortOrder: "asc" } }),
    db.task.findMany({ where: { userId: user.id, weekId: week.id, status: { not: "ARCHIVED" } } }),
    db.goal.findMany({
      where: { userId: user.id, weekId: week.id },
      include: { tasks: { select: { status: true } } },
      orderBy: [{ weeklyPriorityRank: "asc" }, { createdAt: "asc" }],
    }),
    db.goal.findMany({
      where: { userId: user.id, level: "MONTH", monthKey },
      include: { tasks: { select: { status: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.timeBlock.findMany({ where: { dayId: day.id }, orderBy: { startMinutes: "asc" } }),
    db.habit.findMany({ where: { userId: user.id, archived: false }, include: { completions: { select: { date: true } } } }),
  ]);

  const todaysCompleted = todaysTasks.filter((t) => t.status === "COMPLETED").length;
  const todaysProgress = computeCompletionRate(todaysTasks.length, todaysCompleted);
  const top3 = todaysTasks
    .filter((t) => t.dailyPriorityRank !== null)
    .sort((a, b) => (a.dailyPriorityRank ?? 0) - (b.dailyPriorityRank ?? 0))
    .map((t) => ({ id: t.id, title: t.title, completed: t.status === "COMPLETED" }));

  const weekCompleted = weekTasks.filter((t) => t.status === "COMPLETED").length;
  const weeklyCompletionRate = computeCompletionRate(weekTasks.length, weekCompleted);
  const weekGoalsWithProgress = weekGoals.map((g) => ({ id: g.id, title: g.title, progress: computeGoalProgress(g) }));

  const monthGoalsWithProgress = monthGoals.map((g) => ({ id: g.id, title: g.title, progress: computeGoalProgress(g) }));
  const monthlyProgress = monthGoalsWithProgress.length
    ? Math.round(monthGoalsWithProgress.reduce((sum, g) => sum + g.progress, 0) / monthGoalsWithProgress.length)
    : 0;

  const bestStreak = habits.reduce((max, h) => {
    const streak = computeCurrentStreak(new Set(h.completions.map((c) => c.date)), today);
    return Math.max(max, streak);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <Greeting name={user.name ?? user.email.split("@")[0]} />
      <p className="text-sm text-ink-soft mt-1 mb-8">{formatMonthDay(today)}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <section className="rounded-xl border border-hairline bg-surface p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Today</h2>
            <Link href={`/day/${today}`} className="text-xs text-accent-strong font-medium">Open day →</Link>
          </div>
          {top3.length === 0 ? (
            <EmptyState
              prompt="No top priorities chosen for today yet."
              action={<Link href={`/day/${today}`}><Button size="sm">Set today&apos;s top 3</Button></Link>}
            />
          ) : (
            <>
              <QuickTaskList initialTasks={top3} />
              <div className="mt-4 flex items-center gap-2">
                <ProgressBar value={todaysProgress} className="flex-1" />
                <span className="text-xs text-ink-soft w-9 text-right">{todaysProgress}%</span>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border border-hairline bg-surface p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">This week</h2>
            <Link href={`/week/${today}`} className="text-xs text-accent-strong font-medium">Open week →</Link>
          </div>
          {weekGoalsWithProgress.length === 0 ? (
            <EmptyState prompt="What's worth moving forward this week?" action={<Link href={`/week/${today}`}><Button size="sm">Add weekly goal</Button></Link>} />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {weekGoalsWithProgress.map((g) => (
                <li key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink truncate">{g.title}</span>
                    <span className="text-xs text-ink-soft">{g.progress}%</span>
                  </div>
                  <ProgressBar value={g.progress} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-sm">
            <span className="text-ink-soft">Weekly task completion</span>
            <span className="font-medium text-ink">{weeklyCompletionRate}%</span>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <section className="rounded-xl border border-hairline bg-surface p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">This month</h2>
            <Link href="/goals" className="text-xs text-accent-strong font-medium">Open goals →</Link>
          </div>
          {monthGoalsWithProgress.length === 0 ? (
            <EmptyState prompt="No monthly goals yet." action={<Link href="/goals"><Button size="sm">Add monthly goal</Button></Link>} />
          ) : (
            <>
              <ul className="flex flex-col gap-1.5 mb-3">
                {monthGoalsWithProgress.map((g) => (
                  <li key={g.id} className="text-sm text-ink truncate">• {g.title}</li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-sm pt-3 border-t border-hairline">
                <span className="text-ink-soft">Monthly progress</span>
                <span className="font-medium text-ink">{monthlyProgress}%</span>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border border-hairline bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Today&apos;s timeline</h2>
          {timeBlocks.length === 0 ? (
            <EmptyState prompt="Nothing scheduled yet." />
          ) : (
            <ul className="flex flex-col gap-2">
              {timeBlocks.map((block) => (
                <li key={block.id} className="flex items-center gap-2 text-sm">
                  <span className="text-ink-faint w-16 shrink-0">{formatMinutesLabel(block.startMinutes)}</span>
                  <span className="text-ink truncate">{block.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatTile label="Today's tasks" value={String(todaysTasks.length)} />
        <StatTile label="Completed" value={String(todaysCompleted)} />
        <StatTile label="Remaining" value={String(todaysTasks.length - todaysCompleted)} />
        <StatTile label="Weekly tasks" value={`${weekCompleted}/${weekTasks.length}`} sublabel="completed" />
        <StatTile label="Habit streak" value={bestStreak > 0 ? `${bestStreak}d` : "—"} />
      </section>
    </div>
  );
}
