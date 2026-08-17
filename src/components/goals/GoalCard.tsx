"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Select } from "@/components/ui/Field";
import { updateGoal, deleteGoal } from "@/lib/actions/goals";
import { GoalStatus } from "@/generated/prisma/enums";

export type GoalCardData = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: GoalStatus;
  progress: number;
  isPriority: boolean;
  parentTitle?: string | null;
  targetDate: string | null;
};

const STATUS_LABELS: Record<GoalStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ACHIEVED: "Achieved",
  MISSED: "Missed",
  ARCHIVED: "Archived",
};

export function GoalCard({ goal, onRemoved }: { goal: GoalCardData; onRemoved: (id: string) => void }) {
  const [status, setStatus] = useState(goal.status);
  const [isPriority, setIsPriority] = useState(goal.isPriority);

  return (
    <div className={clsx("rounded-xl border bg-surface p-4 flex gap-3", isPriority ? "border-priority" : "border-hairline")}>
      <ProgressRing value={goal.progress} label={goal.title} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{goal.title}</p>
            {goal.parentTitle && <p className="text-[11px] text-ink-faint mt-0.5">from {goal.parentTitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !isPriority;
              setIsPriority(next);
              void updateGoal(goal.id, { isPriority: next });
            }}
            aria-pressed={isPriority}
            aria-label={isPriority ? "Unmark as important" : "Mark as one of my most important goals"}
            className={clsx("shrink-0 p-1 rounded", isPriority ? "text-priority" : "text-ink-faint hover:text-priority")}
          >
            <svg viewBox="0 0 20 20" fill={isPriority ? "currentColor" : "none"} className="h-4 w-4">
              <path d="M10 2.5l2.24 4.54 5.01.73-3.63 3.53.86 4.99L10 13.98l-4.48 2.31.86-4.99-3.63-3.53 5.01-.73L10 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {goal.description && <p className="text-xs text-ink-soft mt-1.5 line-clamp-2">{goal.description}</p>}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium uppercase tracking-wide bg-surface-sunken text-ink-soft rounded-full px-1.5 py-0.5">
            {goal.category}
          </span>
          {goal.targetDate && <span className="text-[11px] text-ink-faint">by {goal.targetDate}</span>}
          <Select
            value={status}
            onChange={(e) => {
              const next = e.target.value as GoalStatus;
              setStatus(next);
              void updateGoal(goal.id, { status: next });
            }}
            className="!w-auto text-xs py-1"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => {
              onRemoved(goal.id);
              void deleteGoal(goal.id);
            }}
            className="text-[11px] text-ink-faint hover:text-danger ml-auto"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
