import "server-only";
import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getOrCreateDay } from "@/lib/planner/days";
import { nextOpenDailyPriorityRanks } from "@/lib/core/dailyPriority";
import { Weekday } from "@/generated/prisma/enums";
import type { PlannedDay } from "@/lib/ai/plan";

// Shared between the original AI-import commit flow and the AI-adjustment flow's
// `creates` array — both write the exact same day/task shape, so the write path
// (get-or-create week/day, respect the Top-3 cap, preserve sort order) must not drift
// between the two call sites.
export async function applyPlannedDays(
  userId: string,
  weekStartsOn: Weekday,
  goalId: string | null,
  days: PlannedDay[]
): Promise<{ daysTouched: number; tasksCreated: number }> {
  let daysTouched = 0;
  let tasksCreated = 0;

  for (const dayPlan of days) {
    const week = await getOrCreateWeek(userId, dayPlan.date, weekStartsOn);
    const day = await getOrCreateDay(userId, dayPlan.date, weekStartsOn);
    if (dayPlan.challenge || dayPlan.objective) {
      await db.day.update({
        where: { id: day.id },
        data: {
          challenge: dayPlan.challenge ?? day.challenge,
          objective: dayPlan.objective ?? day.objective,
        },
      });
    }
    daysTouched++;

    const priorityWantedCount = dayPlan.tasks.filter((t) => t.isPriority).length;
    const ranks = await nextOpenDailyPriorityRanks(userId, day.id, priorityWantedCount);
    let rankCursor = 0;

    const existingSiblingCount = await db.task.count({ where: { userId, weekId: week.id, dayId: day.id } });
    for (let i = 0; i < dayPlan.tasks.length; i++) {
      const t = dayPlan.tasks[i];
      const rank = t.isPriority ? ranks[rankCursor++] : null;
      await db.task.create({
        data: {
          userId,
          weekId: week.id,
          dayId: day.id,
          goalId,
          title: t.title,
          category: t.category ?? null,
          estimatedMinutes: t.estimatedMinutes ?? null,
          notes: t.notes ?? null,
          dailyPriorityRank: rank,
          sortOrder: existingSiblingCount + i,
        },
      });
      tasksCreated++;
    }
  }

  return { daysTouched, tasksCreated };
}
