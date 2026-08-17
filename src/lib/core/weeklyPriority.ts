import "server-only";
import { db } from "@/lib/db";

const MAX_WEEKLY_PRIORITIES = 4;

// The one place this non-negotiable rule (max 4 weekly priority goals, §7/§40) is
// enforced. Both the web Server Action (lib/actions/goals.ts) and the mobile Route
// Handler (app/api/mobile/goals/[id]/priority/route.ts) call this exact function —
// duplicating a transaction this safety-critical across two call sites is how it
// quietly drifts out of sync, which is worse than the extra indirection costs.
export async function toggleWeeklyPriorityCore(userId: string, goalId: string) {
  const goal = await db.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return { error: "Goal not found." };
  if (!goal.weekId) return { error: "This goal isn't attached to a week." };

  return db.$transaction(async (tx) => {
    if (goal.weeklyPriorityRank !== null) {
      await tx.goal.update({ where: { id: goalId }, data: { weeklyPriorityRank: null } });
      return {};
    }

    const existing = await tx.goal.findMany({
      where: { userId, weekId: goal.weekId, weeklyPriorityRank: { not: null } },
      select: { weeklyPriorityRank: true },
    });
    if (existing.length >= MAX_WEEKLY_PRIORITIES) {
      return { error: `This week's top ${MAX_WEEKLY_PRIORITIES} priorities are full. Remove one first.` };
    }
    const usedRanks = new Set(existing.map((g) => g.weeklyPriorityRank));
    let rank = 1;
    while (usedRanks.has(rank)) rank++;

    await tx.goal.update({ where: { id: goalId }, data: { weeklyPriorityRank: rank } });
    return {};
  });
}
