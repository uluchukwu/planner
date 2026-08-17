import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getOrCreateDay } from "@/lib/planner/days";
import { addDays, formatMonthDay, getWeekDays, weekdayOf, WEEKDAY_LABELS, formatDateShort, todayKey } from "@/lib/date/week";
import { ChallengeField, ObjectiveField } from "@/components/planner/ChallengeField";
import { DayView } from "@/components/planner/DayView";
import { TimeBlockTimeline } from "@/components/planner/TimeBlockTimeline";
import { UrgentImportantMatrix } from "@/components/planner/UrgentImportantMatrix";
import { TaskLite } from "@/lib/types";
import { DayOption } from "@/components/planner/DayTaskRow";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateKey(date)) notFound();

  const user = await getCurrentUser();
  const day = await getOrCreateDay(user.id, date, user.weekStartsOn);
  if (!day.weekId) notFound();

  const weekDateKeys = getWeekDays(date, user.weekStartsOn);
  const weekDays = await Promise.all(weekDateKeys.map((key) => getOrCreateDay(user.id, key, user.weekStartsOn)));

  const [rawTasks, rawBlocks, weekGoals] = await Promise.all([
    db.task.findMany({
      where: { userId: user.id, dayId: day.id, status: { not: "ARCHIVED" } },
      include: { goal: { select: { title: true } } },
      orderBy: [{ sortOrder: "asc" }],
    }),
    db.timeBlock.findMany({ where: { dayId: day.id }, orderBy: { startMinutes: "asc" } }),
    db.goal.findMany({ where: { userId: user.id, weekId: day.weekId }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const tasks: TaskLite[] = rawTasks.map((t) => ({
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
  }));

  const dayOptions: DayOption[] = weekDays
    .map((d, i) => ({ dayId: d.id, label: `${WEEKDAY_LABELS[weekdayOf(weekDateKeys[i])]} ${formatDateShort(weekDateKeys[i])}` }))
    .filter((opt) => opt.dayId !== day.id);

  const isToday = date === todayKey();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link href={`/week/${date}`} className="text-xs font-medium text-ink-faint hover:text-ink-soft">← Back to week</Link>
          <h1 className="text-2xl font-semibold text-ink tracking-tight mt-1">
            {isToday ? "Today" : WEEKDAY_LABELS[weekdayOf(date)]} · {formatMonthDay(date)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/day/${addDays(date, -1)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">← Prev</Link>
          {!isToday && (
            <Link href={`/day/${todayKey()}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">Today</Link>
          )}
          <Link href={`/day/${addDays(date, 1)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">Next →</Link>
          <a href={`/day/${date}/export`} className="rounded-lg bg-accent-soft px-3 py-1.5 text-sm text-accent-strong font-medium hover:bg-accent-soft/70">
            Export PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <ChallengeField dayId={day.id} initialValue={day.challenge} />
        <ObjectiveField dayId={day.id} initialValue={day.objective} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <DayView dayId={day.id} weekId={day.weekId} initialTasks={tasks} dayOptions={dayOptions} goalOptions={weekGoals} />
        <div className="flex flex-col gap-4">
          <TimeBlockTimeline dayId={day.id} initialBlocks={rawBlocks} tasks={tasks} />
          <UrgentImportantMatrix tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
