"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { ProgressBar } from "@/components/ui/ProgressRing";
import { Button } from "@/components/ui/Button";
import { GoalLite } from "@/lib/types";
import { createGoal, deleteGoal, toggleWeeklyPriority } from "@/lib/actions/goals";
import { useSyncedState } from "@/lib/hooks/useSyncedState";

const MAX_PRIORITIES = 4;

export function WeeklyPriorityPanel({ weekId, initialGoals }: { weekId: string; initialGoals: GoalLite[] }) {
  const [goals, setGoals] = useSyncedState(initialGoals);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const priorityCount = goals.filter((g) => g.weeklyPriorityRank !== null).length;

  function submitNewGoal() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    setAdding(false);
    startTransition(async () => {
      await createGoal({ level: "WEEK", title: trimmed, weekId });
    });
  }

  async function handleTogglePriority(goalId: string) {
    setError(null);
    const previousRank = goals.find((g) => g.id === goalId)?.weeklyPriorityRank ?? null;
    const wasStarred = previousRank !== null;
    const optimisticRank = wasStarred ? null : priorityCount + 1;

    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, weeklyPriorityRank: optimisticRank } : g)));

    const result = await toggleWeeklyPriority(goalId);
    if (result?.error) {
      setError(result.error);
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, weeklyPriorityRank: previousRank } : g)));
    }
  }

  function handleDelete(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    void deleteGoal(goalId);
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-ink">Weekly priority goals</h2>
        <span className="text-xs text-ink-faint">{priorityCount}/{MAX_PRIORITIES}</span>
      </div>
      <p className="text-xs text-ink-soft mb-3">Pick at most {MAX_PRIORITIES} — the goals that actually matter this week.</p>

      {error && <p className="text-xs text-danger bg-danger-soft rounded-lg px-2.5 py-1.5 mb-2">{error}</p>}

      <ul className="flex flex-col gap-2">
        {goals.map((goal) => (
          <li key={goal.id} className="rounded-lg border border-hairline px-3 py-2.5">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => handleTogglePriority(goal.id)}
                aria-pressed={goal.weeklyPriorityRank !== null}
                aria-label={goal.weeklyPriorityRank !== null ? "Remove from weekly priorities" : "Mark as a weekly priority"}
                className={clsx(
                  "mt-0.5 shrink-0 h-5 w-5 rounded-full border flex items-center justify-center text-[11px] font-semibold transition-colors",
                  goal.weeklyPriorityRank !== null
                    ? "bg-priority border-priority text-white"
                    : "border-ink-faint text-ink-faint hover:border-priority hover:text-priority"
                )}
              >
                {goal.weeklyPriorityRank ?? ""}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{goal.title}</p>
                {goal.parentTitle && <p className="text-[11px] text-ink-faint mt-0.5">from {goal.parentTitle}</p>}
                <div className="mt-1.5 flex items-center gap-2">
                  <ProgressBar value={goal.progress} className="flex-1" />
                  <span className="text-[11px] text-ink-soft w-8 text-right">{goal.progress}%</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(goal.id)}
                aria-label={`Delete goal "${goal.title}"`}
                className="text-ink-faint hover:text-danger p-0.5"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {goals.length === 0 && !adding && (
        <p className="text-sm text-ink-soft py-2">What&apos;s worth moving forward this week?</p>
      )}

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitNewGoal();
          }}
          className="mt-2 flex gap-1.5"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => !title.trim() && setAdding(false)}
            placeholder="e.g. Finish MSc assignment"
            className="w-full rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-sm focus:outline-2 focus:outline-accent"
          />
        </form>
      ) : (
        <Button variant="ghost" size="sm" className="mt-2 w-full justify-center" onClick={() => setAdding(true)}>
          + Add weekly goal
        </Button>
      )}
    </section>
  );
}
