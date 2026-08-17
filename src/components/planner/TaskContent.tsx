"use client";

import { clsx } from "clsx";
import { Checkbox } from "@/components/ui/Checkbox";
import { TaskLite, PRIORITY_QUADRANT_LABELS } from "@/lib/types";

export function TaskContent({
  task,
  onToggleComplete,
  onDelete,
  dragHandle,
  trailing,
}: {
  task: TaskLite;
  onToggleComplete: () => void;
  onDelete: () => void;
  dragHandle?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const completed = task.status === "COMPLETED";

  return (
    <div className="group flex items-start gap-2 rounded-lg border border-hairline bg-surface px-2.5 py-2">
      {dragHandle}
      <div className="pt-0.5">
        <Checkbox checked={completed} onToggle={onToggleComplete} label={`Mark "${task.title}" ${completed ? "incomplete" : "complete"}`} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx("text-sm leading-snug break-words", completed ? "text-ink-faint line-through" : "text-ink")}>
          {task.title}
        </p>
        {(task.category || task.dueTime || task.estimatedMinutes || task.priority || task.goalTitle) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {task.dueTime && <Chip>{task.dueTime}</Chip>}
            {task.estimatedMinutes && <Chip>{task.estimatedMinutes}m</Chip>}
            {task.category && <Chip>{task.category}</Chip>}
            {task.priority && <Chip tone="priority">{PRIORITY_QUADRANT_LABELS[task.priority].short}</Chip>}
            {task.goalTitle && <Chip tone="accent">{task.goalTitle}</Chip>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${task.title}"`}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-ink-faint hover:text-danger transition-opacity p-1 rounded"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "priority" | "accent" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        tone === "neutral" && "bg-surface-sunken text-ink-soft",
        tone === "priority" && "bg-priority-soft text-priority",
        tone === "accent" && "bg-accent-soft text-accent-strong"
      )}
    >
      {children}
    </span>
  );
}
