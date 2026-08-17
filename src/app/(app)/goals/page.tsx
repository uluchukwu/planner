import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { computeGoalProgress } from "@/lib/progress";
import { todayKey, shiftMonthKey, formatMonthLabel } from "@/lib/date/week";
import { GoalList } from "@/components/goals/GoalList";
import { NewGoalForm } from "@/components/goals/NewGoalForm";
import { GoalCardData } from "@/components/goals/GoalCard";

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const user = await getCurrentUser();

  const currentYear = new Date().getFullYear();
  const year = yearParam ? Number(yearParam) : currentYear;
  const monthKey = monthParam ?? todayKey().slice(0, 7);

  const [yearGoals, monthGoals] = await Promise.all([
    db.goal.findMany({
      where: { userId: user.id, level: "YEAR", yearKey: year },
      include: { tasks: { select: { status: true } } },
      orderBy: [{ isPriority: "desc" }, { createdAt: "asc" }],
    }),
    db.goal.findMany({
      where: { userId: user.id, level: "MONTH", monthKey },
      include: { tasks: { select: { status: true } }, parent: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const yearGoalCards: GoalCardData[] = yearGoals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    status: g.status,
    progress: computeGoalProgress(g),
    isPriority: g.isPriority,
    targetDate: g.targetDate,
  }));

  const monthGoalCards: GoalCardData[] = monthGoals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    status: g.status,
    progress: computeGoalProgress(g),
    isPriority: g.isPriority,
    parentTitle: g.parent?.title ?? null,
    targetDate: g.targetDate,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-10">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h1 className="text-xl font-semibold text-ink tracking-tight">{year} Goals</h1>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/goals?year=${year - 1}&month=${monthKey}`} className="text-ink-soft hover:text-ink">← {year - 1}</Link>
            <Link href={`/goals?year=${year + 1}&month=${monthKey}`} className="text-ink-soft hover:text-ink">{year + 1} →</Link>
          </div>
        </div>
        <p className="text-sm text-ink-soft mb-4">The handful of things that would make {year} count. Tap the star to mark what matters most.</p>
        <div className="mb-3">
          <GoalList initialGoals={yearGoalCards} emptyPrompt="No yearly goals yet. What would make this year count?" />
        </div>
        <NewGoalForm level="YEAR" yearKey={year} />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h1 className="text-xl font-semibold text-ink tracking-tight">{formatMonthLabel(monthKey)}</h1>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/goals?year=${year}&month=${shiftMonthKey(monthKey, -1)}`} className="text-ink-soft hover:text-ink">← Prev</Link>
            <Link href={`/goals?year=${year}&month=${shiftMonthKey(monthKey, 1)}`} className="text-ink-soft hover:text-ink">Next →</Link>
            <a href={`/goals/export?year=${year}&month=${monthKey}`} className="text-accent-strong font-medium hover:underline">Export PDF</a>
          </div>
        </div>
        <p className="text-sm text-ink-soft mb-4">This month&apos;s focus, optionally linked to a yearly goal above.</p>
        <div className="mb-3">
          <GoalList initialGoals={monthGoalCards} emptyPrompt="No goals for this month yet." />
        </div>
        <NewGoalForm level="MONTH" monthKey={monthKey} parentOptions={yearGoals.map((g) => ({ id: g.id, title: g.title }))} />
      </section>
    </div>
  );
}
