import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getOrCreateDay } from "@/lib/planner/days";
import { getOrCreateWeeklyChecklist } from "@/lib/planner/checklists";
import { getWeekDays, formatWeekRange, formatDateShort, addDays, weekdayOf, WEEKDAY_LABELS, todayKey } from "@/lib/date/week";
import { computeGoalProgress } from "@/lib/progress";
import { computeCurrentStreak } from "@/lib/habits";
import { WeeklyPriorityPanel } from "@/components/planner/WeeklyPriorityPanel";
import { WeekBoard, BoardColumn } from "@/components/planner/WeekBoard";
import { HabitTracker } from "@/components/habits/HabitTracker";
import { Checklist } from "@/components/planner/Checklist";
import { TaskLite, GoalLite, HabitLite } from "@/lib/types";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export default async function WeekPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateKey(date)) notFound();

  const user = await getCurrentUser();
  const week = await getOrCreateWeek(user.id, date, user.weekStartsOn);
  const dateKeys = getWeekDays(date, user.weekStartsOn);
  const days = await Promise.all(dateKeys.map((key) => getOrCreateDay(user.id, key, user.weekStartsOn)));

  const [rawTasks, weekGoals, rawHabits, checklist] = await Promise.all([
    db.task.findMany({
      where: { userId: user.id, weekId: week.id, status: { not: "ARCHIVED" } },
      include: { goal: { select: { title: true } } },
      orderBy: [{ sortOrder: "asc" }],
    }),
    db.goal.findMany({
      where: { userId: user.id, weekId: week.id },
      include: { tasks: { select: { status: true } }, parent: { select: { title: true } } },
      orderBy: [{ weeklyPriorityRank: "asc" }, { createdAt: "asc" }],
    }),
    db.habit.findMany({
      where: { userId: user.id, archived: false },
      include: { completions: { select: { date: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getOrCreateWeeklyChecklist(user.id, week.id),
  ]);

  const goalLites: GoalLite[] = weekGoals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    status: g.status,
    weeklyPriorityRank: g.weeklyPriorityRank,
    isPriority: g.isPriority,
    progress: computeGoalProgress(g),
    parentTitle: g.parent?.title ?? null,
    category: g.category,
    targetDate: g.targetDate,
  }));

  const columns: BoardColumn[] = [
    { key: "inbox", label: "Inbox", sublabel: "unscheduled", dayId: null },
    ...days.map((day, i) => ({
      key: day.id,
      label: WEEKDAY_LABELS[weekdayOf(dateKeys[i])],
      sublabel: formatDateShort(dateKeys[i]),
      dayId: day.id,
      href: `/day/${dateKeys[i]}`,
    })),
  ];

  const tasksByColumn: Record<string, TaskLite[]> = { inbox: [] };
  for (const day of days) tasksByColumn[day.id] = [];
  for (const t of rawTasks) {
    const key = t.dayId ?? "inbox";
    if (!tasksByColumn[key]) tasksByColumn[key] = [];
    tasksByColumn[key].push({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: t.category,
      dueTime: t.dueTime,
      estimatedMinutes: t.estimatedMinutes,
      dailyPriorityRank: t.dailyPriorityRank,
      goalId: t.goalId,
      goalTitle: t.goal?.title ?? null,
      notes: t.notes,
      sortOrder: t.sortOrder,
    });
  }

  const habitLites: HabitLite[] = rawHabits.map((h) => {
    const completionDates = new Set(h.completions.map((c) => c.date));
    return {
      id: h.id,
      name: h.name,
      weekDots: dateKeys.map((key) => completionDates.has(key)),
      currentStreak: computeCurrentStreak(completionDates, todayKey()),
    };
  });

  const weekStart = dateKeys[0];
  const weekEnd = dateKeys[6];
  const isCurrentWeek = dateKeys.includes(todayKey());

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">{isCurrentWeek ? "This week" : "Week"}</p>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Week of {formatWeekRange(weekStart, weekEnd)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/week/${addDays(weekStart, -7)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
            ← Prev
          </Link>
          {!isCurrentWeek && (
            <Link href={`/week/${todayKey()}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
              This week
            </Link>
          )}
          <Link href={`/week/${addDays(weekStart, 7)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
            Next →
          </Link>
          <Link href={`/week/${date}/review`} className="rounded-lg bg-accent-soft px-3 py-1.5 text-sm text-accent-strong font-medium hover:bg-accent-soft/70">
            Weekly review
          </Link>
          <a href={`/week/${date}/export`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
            Export PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 mb-5">
        <WeeklyPriorityPanel weekId={week.id} initialGoals={goalLites} />
        <div className="min-w-0">
          <WeekBoard weekId={week.id} columns={columns} initialTasks={tasksByColumn} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <HabitTracker
          weekDateKeys={dateKeys}
          weekdayLabels={dateKeys.map((key) => WEEKDAY_LABELS[weekdayOf(key)])}
          initialHabits={habitLites}
        />
        <Checklist
          checklistId={checklist.id}
          title="Weekly checklist"
          initialItems={checklist.items.map((i) => ({ id: i.id, label: i.label, completed: i.completed }))}
        />
      </div>
    </div>
  );
}
