"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressRing";
import { createHabit, deleteHabit, updateHabit } from "@/lib/actions/habits";
import { useSyncedState } from "@/lib/hooks/useSyncedState";

export type HabitManageRow = {
  id: string;
  name: string;
  archived: boolean;
  currentStreak: number;
  weekCompletions: number;
  monthlyCompletionPct: number;
};

export function HabitManageList({ initialHabits }: { initialHabits: HabitManageRow[] }) {
  const [habits, setHabits] = useSyncedState(initialHabits);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);

  function submitNewHabit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    setAdding(false);
    void createHabit({ name: trimmed });
  }

  function handleArchiveToggle(id: string, archived: boolean) {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, archived } : h)));
    void updateHabit(id, { archived });
  }

  function handleDelete(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    void deleteHabit(id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {active.map((habit) => (
          <div key={habit.id} className="rounded-xl border border-hairline bg-surface p-4 flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{habit.name}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar value={habit.monthlyCompletionPct} className="flex-1" />
                <span className="text-[11px] text-ink-soft w-16 text-right">{habit.monthlyCompletionPct}% month</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-priority">{habit.currentStreak}d streak</p>
              <p className="text-xs text-ink-faint">{habit.weekCompletions}/7 this week</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={() => handleArchiveToggle(habit.id, true)} className="text-xs text-ink-faint hover:text-ink-soft">
                Archive
              </button>
              <button type="button" onClick={() => handleDelete(habit.id)} className="text-xs text-ink-faint hover:text-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {active.length === 0 && !adding && (
        <p className="text-sm text-ink-soft">No habits yet. What&apos;s worth showing up for daily?</p>
      )}

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitNewHabit();
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name.trim() && setAdding(false)}
            placeholder="e.g. Drink water"
            className="w-full max-w-xs rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-sm focus:outline-2 focus:outline-accent"
          />
          <Button type="submit" variant="primary" size="sm">Add</Button>
        </form>
      ) : (
        <Button variant="secondary" size="sm" className="self-start" onClick={() => setAdding(true)}>
          + Add habit
        </Button>
      )}

      {archived.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-ink-soft">Archived ({archived.length})</summary>
          <div className="mt-2 flex flex-col gap-2">
            {archived.map((habit) => (
              <div key={habit.id} className={clsx("rounded-lg border border-hairline px-3 py-2 flex items-center justify-between")}>
                <span className="text-sm text-ink-faint">{habit.name}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleArchiveToggle(habit.id, false)} className="text-xs text-accent-strong">
                    Restore
                  </button>
                  <button type="button" onClick={() => handleDelete(habit.id)} className="text-xs text-ink-faint hover:text-danger">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
