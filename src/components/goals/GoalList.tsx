"use client";

import { GoalCard, GoalCardData } from "@/components/goals/GoalCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSyncedState } from "@/lib/hooks/useSyncedState";

export function GoalList({ initialGoals, emptyPrompt }: { initialGoals: GoalCardData[]; emptyPrompt: string }) {
  const [goals, setGoals] = useSyncedState(initialGoals);

  if (goals.length === 0) {
    return <EmptyState prompt={emptyPrompt} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} onRemoved={(id) => setGoals((prev) => prev.filter((g) => g.id !== id))} />
      ))}
    </div>
  );
}
