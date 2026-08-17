import { TaskStatus } from "@/generated/prisma/enums";

type ProgressInput = {
  progressMode: "AUTO" | "MANUAL";
  manualProgress: number | null;
  tasks: { status: TaskStatus }[];
};

// Task completion, goal progress, habit completion, and expense stats are kept as
// clearly distinct numbers (see /docs/DATABASE.md) — this is the one function that
// turns a goal + its linked tasks into a single progress percentage, and it never
// silently guesses: MANUAL mode always uses the stored value, even 0.
export function computeGoalProgress(goal: ProgressInput): number {
  if (goal.progressMode === "MANUAL") {
    return goal.manualProgress ?? 0;
  }
  if (goal.tasks.length === 0) return 0;
  const completed = goal.tasks.filter((t) => t.status === "COMPLETED").length;
  return Math.round((completed / goal.tasks.length) * 100);
}

export function computeCompletionRate(total: number, completed: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
