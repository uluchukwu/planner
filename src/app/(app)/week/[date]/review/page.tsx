import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getWeekDays, weekdayOf, WEEKDAY_LABELS, formatDateShort, formatWeekRange, addDays } from "@/lib/date/week";
import { computeGoalProgress, computeCompletionRate } from "@/lib/progress";
import { countCompletionsInRange } from "@/lib/habits";
import { WeeklyReviewForm } from "@/components/planner/WeeklyReviewForm";
import { WeeklyReviewTriage, NextWeekDayOption } from "@/components/planner/WeeklyReviewTriage";
import { ProgressBar } from "@/components/ui/ProgressRing";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export default async function WeeklyReviewPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateKey(date)) notFound();

  const user = await getCurrentUser();
  const week = await getOrCreateWeek(user.id, date, user.weekStartsOn);
  const dateKeys = getWeekDays(date, user.weekStartsOn);

  // Deliberately unfiltered by status (unlike the planner views): §27 says progress
  // must never mislead, and archiving an incomplete task during triage shouldn't
  // retroactively shrink "planned" and inflate the completion rate.
  const [allTasks, weekGoals, existingReview, activeHabits] = await Promise.all([
    db.task.findMany({ where: { userId: user.id, weekId: week.id } }),
    db.goal.findMany({
      where: { userId: user.id, weekId: week.id },
      include: { tasks: { select: { status: true } }, parent: { select: { title: true } } },
      orderBy: [{ weeklyPriorityRank: "asc" }, { createdAt: "asc" }],
    }),
    db.weeklyReview.findUnique({ where: { weekId: week.id } }),
    db.habit.findMany({ where: { userId: user.id, archived: false }, include: { completions: { select: { date: true } } } }),
  ]);

  const planned = allTasks.length;
  const completed = allTasks.filter((t) => t.status === "COMPLETED").length;
  const completionRate = computeCompletionRate(planned, completed);
  const incompleteTasks = allTasks.filter((t) => t.status === "PENDING").map((t) => ({ id: t.id, title: t.title }));

  const goalsWithProgress = weekGoals.map((g) => ({ id: g.id, title: g.title, progress: computeGoalProgress(g), status: g.status }));

  const habitAverages = activeHabits.map((h) => {
    const dates = new Set(h.completions.map((c) => c.date));
    return Math.round((countCompletionsInRange(dates, dateKeys) / 7) * 100);
  });
  const habitsAvgCompletion = habitAverages.length ? Math.round(habitAverages.reduce((a, b) => a + b, 0) / habitAverages.length) : null;

  const nextWeekStart = addDays(dateKeys[0], 7);
  const nextWeekDateKeys = getWeekDays(nextWeekStart, user.weekStartsOn);
  const nextWeekDays: NextWeekDayOption[] = nextWeekDateKeys.map((key) => ({
    dateKey: key,
    label: `${WEEKDAY_LABELS[weekdayOf(key)]} ${formatDateShort(key)}`,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <Link href={`/week/${date}`} className="text-xs font-medium text-ink-faint hover:text-ink-soft">← Back to week</Link>
      <h1 className="text-2xl font-semibold text-ink tracking-tight mt-1 mb-1">Weekly review</h1>
      <p className="text-sm text-ink-soft mb-6">Week of {formatWeekRange(dateKeys[0], dateKeys[6])}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">Planned</p>
          <p className="text-xl font-semibold text-ink mt-0.5">{planned}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">Completed</p>
          <p className="text-xl font-semibold text-ink mt-0.5">{completed}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">Completion rate</p>
          <p className="text-xl font-semibold text-ink mt-0.5">{completionRate}%</p>
        </div>
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">Habits avg.</p>
          <p className="text-xl font-semibold text-ink mt-0.5">{habitsAvgCompletion === null ? "—" : `${habitsAvgCompletion}%`}</p>
        </div>
      </div>

      {goalsWithProgress.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ink mb-2">Goals</h2>
          <ul className="flex flex-col gap-2.5">
            {goalsWithProgress.map((g) => (
              <li key={g.id} className="rounded-lg border border-hairline bg-surface px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ink">{g.title} {g.progress >= 100 && "✓"}</span>
                  <span className="text-xs text-ink-soft">{g.progress}%</span>
                </div>
                <ProgressBar value={g.progress} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink mb-2">Incomplete tasks</h2>
        <p className="text-xs text-ink-soft mb-3">Nothing carries forward automatically — decide what happens to each one.</p>
        <WeeklyReviewTriage initialTasks={incompleteTasks} nextWeekDays={nextWeekDays} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink mb-3">Reflection</h2>
        <WeeklyReviewForm
          weekId={week.id}
          initial={{
            wentWell: existingReview?.wentWell ?? "",
            didntGoWell: existingReview?.didntGoWell ?? "",
            learned: existingReview?.learned ?? "",
            changeNextWeek: existingReview?.changeNextWeek ?? "",
            proudOf: existingReview?.proudOf ?? "",
            carryForward: existingReview?.carryForward ?? "",
          }}
        />
      </section>
    </div>
  );
}
