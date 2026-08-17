"use client";

import { clsx } from "clsx";
import { TaskContent } from "@/components/planner/TaskContent";
import { TaskLite, PRIORITY_QUADRANT_LABELS } from "@/lib/types";
import { updateTask, moveTask } from "@/lib/actions/tasks";
import { TaskPriority } from "@/generated/prisma/enums";

export type DayOption = { dayId: string; label: string };
export type GoalOption = { id: string; title: string };

export function DayTaskRow({
  task,
  onToggleComplete,
  onDelete,
  onToggleStar,
  dayOptions,
  goalOptions,
}: {
  task: TaskLite;
  onToggleComplete: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  dayOptions: DayOption[];
  goalOptions: GoalOption[];
}) {
  return (
    <TaskContent
      task={task}
      onToggleComplete={onToggleComplete}
      onDelete={onDelete}
      trailing={
        <>
          <button
            type="button"
            onClick={onToggleStar}
            aria-pressed={task.dailyPriorityRank !== null}
            aria-label={task.dailyPriorityRank !== null ? "Remove from today's top 3" : "Mark as a top-3 priority today"}
            className={clsx(
              "h-6 w-6 rounded-full border flex items-center justify-center text-[11px] font-semibold transition-colors shrink-0",
              task.dailyPriorityRank !== null
                ? "bg-priority border-priority text-white"
                : "border-ink-faint text-ink-faint hover:border-priority hover:text-priority"
            )}
          >
            {task.dailyPriorityRank ?? "★"}
          </button>
          <details className="relative">
            <summary className="list-none cursor-pointer select-none text-ink-faint hover:text-ink-soft p-1 rounded" aria-label="More actions">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <circle cx="4" cy="10" r="1.4" fill="currentColor" />
                <circle cx="10" cy="10" r="1.4" fill="currentColor" />
                <circle cx="16" cy="10" r="1.4" fill="currentColor" />
              </svg>
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-hairline bg-surface p-3 shadow-lg flex flex-col gap-2.5">
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Urgent / important
                <select
                  defaultValue={task.priority ?? ""}
                  onChange={(e) => updateTask(task.id, { priority: (e.target.value || null) as TaskPriority | null })}
                  className="rounded-md border border-hairline bg-surface px-2 py-1 text-sm text-ink"
                >
                  <option value="">Not set</option>
                  {Object.entries(PRIORITY_QUADRANT_LABELS).map(([value, { long }]) => (
                    <option key={value} value={value}>{long}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Move to
                <select
                  defaultValue={task.id}
                  onChange={(e) => {
                    const target = e.target.value === "inbox" ? null : e.target.value;
                    void moveTask(task.id, target);
                  }}
                  className="rounded-md border border-hairline bg-surface px-2 py-1 text-sm text-ink"
                >
                  <option value={task.id} disabled>Choose a day…</option>
                  <option value="inbox">Weekly inbox</option>
                  {dayOptions.map((d) => (
                    <option key={d.dayId} value={d.dayId}>{d.label}</option>
                  ))}
                </select>
              </label>
              {goalOptions.length > 0 && (
                <label className="flex flex-col gap-1 text-xs text-ink-soft">
                  Weekly goal
                  <select
                    defaultValue={task.goalId ?? ""}
                    onChange={(e) => void updateTask(task.id, { goalId: e.target.value || null })}
                    className="rounded-md border border-hairline bg-surface px-2 py-1 text-sm text-ink"
                  >
                    <option value="">None</option>
                    {goalOptions.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </details>
        </>
      }
    />
  );
}
