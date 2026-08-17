"use client";

import { useState } from "react";
import { TaskLite } from "@/lib/types";
import { DayTaskRow, DayOption, GoalOption } from "@/components/planner/DayTaskRow";
import { QuickAddTask } from "@/components/planner/QuickAddTask";
import { EmptyState } from "@/components/ui/EmptyState";
import { createTask, toggleTaskComplete, deleteTask, toggleDailyPriority } from "@/lib/actions/tasks";
import { useSyncedState } from "@/lib/hooks/useSyncedState";

export function DayView({
  dayId,
  weekId,
  initialTasks,
  dayOptions,
  goalOptions,
}: {
  dayId: string;
  weekId: string;
  initialTasks: TaskLite[];
  dayOptions: DayOption[];
  goalOptions: GoalOption[];
}) {
  const [tasks, setTasks] = useSyncedState(initialTasks);
  const [error, setError] = useState<string | null>(null);

  const priorities = tasks.filter((t) => t.dailyPriorityRank !== null).sort((a, b) => (a.dailyPriorityRank ?? 0) - (b.dailyPriorityRank ?? 0));
  const others = tasks.filter((t) => t.dailyPriorityRank === null);

  function handleAdd(title: string) {
    // No optimistic insert here: the new row needs a server-issued id, and the synced
    // list (useSyncedState) picks it up as soon as createTask's revalidation lands.
    void createTask({ title, weekId, dayId });
  }

  function handleToggle(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === "COMPLETED" ? "PENDING" : "COMPLETED" } : t))
    );
    void toggleTaskComplete(taskId);
  }

  function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    void deleteTask(taskId);
  }

  async function handleToggleStar(taskId: string) {
    setError(null);
    const previousRank = tasks.find((t) => t.id === taskId)?.dailyPriorityRank ?? null;
    const wasStarred = previousRank !== null;
    const optimisticRank = wasStarred ? null : priorities.length + 1;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dailyPriorityRank: optimisticRank } : t)));

    const result = await toggleDailyPriority(taskId);
    if (result?.error) {
      setError(result.error);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dailyPriorityRank: previousRank } : t)));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink">Today&apos;s top 3</h2>
          <span className="text-xs text-ink-faint">{priorities.length}/3</span>
        </div>
        {error && <p className="text-xs text-danger bg-danger-soft rounded-lg px-2.5 py-1.5 mb-2">{error}</p>}
        {priorities.length === 0 ? (
          <EmptyState prompt="Choose up to 3 things that would make today a win." />
        ) : (
          <div className="flex flex-col gap-2">
            {priorities.map((task) => (
              <div key={task.id} className="rounded-xl border-2 border-priority-soft bg-priority-soft/40 p-0.5">
                <DayTaskRow
                  task={task}
                  onToggleComplete={() => handleToggle(task.id)}
                  onDelete={() => handleDelete(task.id)}
                  onToggleStar={() => handleToggleStar(task.id)}
                  dayOptions={dayOptions}
                  goalOptions={goalOptions}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">Other tasks</h2>
        <div className="flex flex-col gap-1.5">
          {others.map((task) => (
            <DayTaskRow
              key={task.id}
              task={task}
              onToggleComplete={() => handleToggle(task.id)}
              onDelete={() => handleDelete(task.id)}
              onToggleStar={() => handleToggleStar(task.id)}
              dayOptions={dayOptions}
              goalOptions={goalOptions}
            />
          ))}
        </div>
        <div className="mt-2">
          <QuickAddTask onAdd={handleAdd} placeholder="Add a task for today…" />
        </div>
      </section>
    </div>
  );
}
