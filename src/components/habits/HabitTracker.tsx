"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { HabitLite } from "@/lib/types";
import { createHabit, deleteHabit, toggleHabitCompletion } from "@/lib/actions/habits";
import { useSyncedState } from "@/lib/hooks/useSyncedState";
import { Button } from "@/components/ui/Button";

// weekDateKeys/weekdayLabels describe whichever week is currently on screen — a habit
// dot always writes to the date it visually sits under, not to "today", so navigating
// to a past or future week and toggling a dot edits that week's history correctly.
export function HabitTracker({
  weekDateKeys,
  weekdayLabels,
  initialHabits,
}: {
  weekDateKeys: string[];
  weekdayLabels: string[];
  initialHabits: HabitLite[];
}) {
  const [habits, setHabits] = useSyncedState(initialHabits);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function handleToggleDot(habitId: string, dayIndex: number) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, weekDots: h.weekDots.map((v, i) => (i === dayIndex ? !v : v)) }
          : h
      )
    );
    void toggleHabitCompletion(habitId, weekDateKeys[dayIndex]);
  }

  function handleDelete(habitId: string) {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    void deleteHabit(habitId);
  }

  function submitNewHabit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    setAdding(false);
    void createHabit({ name: trimmed });
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink mb-3">Habit tracker</h2>

      {habits.length > 0 && (
        <div className="grid mb-2" style={{ gridTemplateColumns: `1fr repeat(7, 1.75rem) 2.5rem` }}>
          <span />
          {weekdayLabels.map((label, i) => (
            <span key={i} className="text-center text-[10px] font-medium text-ink-faint">{label[0]}</span>
          ))}
          <span />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="grid items-center gap-y-1"
            style={{ gridTemplateColumns: `1fr repeat(7, 1.75rem) 2.5rem` }}
          >
            <span className="text-sm text-ink truncate pr-2">{habit.name}</span>
            {habit.weekDots.map((done, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleToggleDot(habit.id, i)}
                aria-pressed={done}
                aria-label={`${habit.name} — ${weekdayLabels[i]}, ${done ? "completed" : "not completed"}`}
                className="flex items-center justify-center"
              >
                <span
                  className={clsx(
                    "h-3.5 w-3.5 rounded-full border transition-colors",
                    done ? "bg-accent border-accent" : "border-ink-faint hover:border-accent"
                  )}
                />
              </button>
            ))}
            <div className="flex items-center justify-end gap-1">
              {habit.currentStreak > 0 && (
                <span className="text-[10px] font-medium text-priority" title={`${habit.currentStreak}-day streak`}>
                  {habit.currentStreak}d
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(habit.id)}
                aria-label={`Delete habit "${habit.name}"`}
                className="text-ink-faint hover:text-danger p-0.5"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {habits.length === 0 && !adding && (
        <p className="text-sm text-ink-soft py-2">What&apos;s a habit worth showing up for daily?</p>
      )}

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitNewHabit();
          }}
          className="mt-2 flex gap-1.5"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name.trim() && setAdding(false)}
            placeholder="e.g. Read, Exercise, Code"
            className="w-full rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-sm focus:outline-2 focus:outline-accent"
          />
        </form>
      ) : (
        <Button variant="ghost" size="sm" className="mt-2 w-full justify-center" onClick={() => setAdding(true)}>
          + Add habit
        </Button>
      )}
    </section>
  );
}
