import "server-only";
import { db } from "@/lib/db";

const MAX_DAILY_PRIORITIES = 3;

// Shared between the manual toggle (lib/actions/tasks.ts) and the AI-import commit
// flow (lib/actions/aiImport.ts) — the non-negotiable "max 3 daily priorities" rule
// must not drift between call sites, same rationale as lib/core/weeklyPriority.ts
// for the weekly-priority cap.
export async function toggleDailyPriorityCore(userId: string, taskId: string) {
  const task = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!task) return { error: "Task not found." };
  if (!task.dayId) return { error: "Assign this task to a day first." };

  return db.$transaction(async (tx) => {
    if (task.dailyPriorityRank !== null) {
      await tx.task.update({ where: { id: taskId }, data: { dailyPriorityRank: null } });
      return {};
    }
    const existing = await tx.task.findMany({
      where: { userId, dayId: task.dayId, dailyPriorityRank: { not: null } },
      select: { dailyPriorityRank: true },
    });
    if (existing.length >= MAX_DAILY_PRIORITIES) {
      return { error: `Today's top ${MAX_DAILY_PRIORITIES} is full. Remove one first.` };
    }
    const usedRanks = new Set(existing.map((t) => t.dailyPriorityRank));
    let rank = 1;
    while (usedRanks.has(rank)) rank++;

    await tx.task.update({ where: { id: taskId }, data: { dailyPriorityRank: rank } });
    return {};
  });
}

// Bulk variant for creating several new tasks on a day at once (the AI import flow):
// returns, per requested slot in order, the rank to assign or null once the day's
// Top 3 is full. Never touches an existing task's rank — only tells the caller which
// of ITS new tasks still fit, so importing a plan into a day that already has
// priorities can't silently overflow past 3.
export async function nextOpenDailyPriorityRanks(userId: string, dayId: string, count: number): Promise<(number | null)[]> {
  const existing = await db.task.findMany({
    where: { userId, dayId, dailyPriorityRank: { not: null } },
    select: { dailyPriorityRank: true },
  });
  const used = new Set(existing.map((t) => t.dailyPriorityRank));
  const ranks: (number | null)[] = [];
  let rank = 1;
  for (let i = 0; i < count; i++) {
    while (used.has(rank) && rank <= MAX_DAILY_PRIORITIES) rank++;
    if (rank > MAX_DAILY_PRIORITIES) {
      ranks.push(null);
    } else {
      ranks.push(rank);
      used.add(rank);
      rank++;
    }
  }
  return ranks;
}
