"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { toggleWeeklyPriorityCore } from "@/lib/core/weeklyPriority";
import { GoalLevel, GoalCategory, GoalStatus, ProgressMode } from "@/generated/prisma/enums";

function refresh() {
  revalidatePath("/", "layout");
}

async function ownedGoalOrThrow(goalId: string, userId: string) {
  const goal = await db.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new Error("Goal not found.");
  return goal;
}

export async function createGoal(input: {
  level: GoalLevel;
  title: string;
  description?: string | null;
  category?: GoalCategory;
  targetDate?: string | null;
  parentId?: string | null;
  weekId?: string | null;
  monthKey?: string | null;
  yearKey?: number | null;
  progressMode?: ProgressMode;
  manualProgress?: number | null;
  isPriority?: boolean;
}) {
  const { userId } = await verifySession();
  const title = input.title.trim();
  if (!title) return { error: "Goal title can't be empty." };

  await db.goal.create({
    data: {
      userId,
      level: input.level,
      title,
      description: input.description ?? null,
      category: input.category ?? "OTHER",
      targetDate: input.targetDate ?? null,
      parentId: input.parentId ?? null,
      weekId: input.weekId ?? null,
      monthKey: input.monthKey ?? null,
      yearKey: input.yearKey ?? null,
      progressMode: input.progressMode ?? "AUTO",
      manualProgress: input.manualProgress ?? null,
      isPriority: input.isPriority ?? false,
    },
  });
  refresh();
}

export async function updateGoal(
  goalId: string,
  fields: Partial<{
    title: string;
    description: string | null;
    category: GoalCategory;
    targetDate: string | null;
    status: GoalStatus;
    notes: string | null;
    progressMode: ProgressMode;
    manualProgress: number | null;
    isPriority: boolean;
    parentId: string | null;
  }>
) {
  const { userId } = await verifySession();
  await ownedGoalOrThrow(goalId, userId);
  await db.goal.update({ where: { id: goalId }, data: fields });
  refresh();
}

export async function deleteGoal(goalId: string) {
  const { userId } = await verifySession();
  await ownedGoalOrThrow(goalId, userId);
  await db.goal.delete({ where: { id: goalId } });
  refresh();
}

// Enforces the non-negotiable "max 4 weekly priority goals" rule (§40 / §7) — the
// actual transaction lives in lib/core/weeklyPriority.ts, shared with the mobile route.
export async function toggleWeeklyPriority(goalId: string) {
  const { userId } = await verifySession();
  const result = await toggleWeeklyPriorityCore(userId, goalId);
  if (!result.error) refresh();
  return result;
}
