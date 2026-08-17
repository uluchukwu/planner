"use client";

import { useSyncedState } from "@/lib/hooks/useSyncedState";
import { moveTaskToNextWeek, rescheduleTaskToDate, archiveTask } from "@/lib/actions/weeklyReview";
import { EmptyState } from "@/components/ui/EmptyState";

export type TriageTask = { id: string; title: string };
export type NextWeekDayOption = { dateKey: string; label: string };

export function WeeklyReviewTriage({
  initialTasks,
  nextWeekDays,
}: {
  initialTasks: TriageTask[];
  nextWeekDays: NextWeekDayOption[];
}) {
  const [tasks, setTasks] = useSyncedState(initialTasks);

  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  if (tasks.length === 0) {
    return <EmptyState prompt="Nothing left incomplete — everything planned this week was either finished or already handled." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li key={task.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2">
          <span className="text-sm text-ink flex-1 min-w-[10rem]">{task.title}</span>
          <button
            type="button"
            onClick={() => {
              remove(task.id);
              void moveTaskToNextWeek(task.id);
            }}
            className="text-xs font-medium text-accent-strong hover:underline"
          >
            Move to next week
          </button>
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const dateKey = e.target.value;
              remove(task.id);
              void rescheduleTaskToDate(task.id, dateKey);
            }}
            className="text-xs rounded-md border border-hairline bg-surface px-1.5 py-1 text-ink-soft"
          >
            <option value="">Reschedule to…</option>
            {nextWeekDays.map((d) => (
              <option key={d.dateKey} value={d.dateKey}>{d.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              remove(task.id);
              void archiveTask(task.id);
            }}
            className="text-xs font-medium text-ink-faint hover:text-danger"
          >
            Archive
          </button>
        </li>
      ))}
    </ul>
  );
}
