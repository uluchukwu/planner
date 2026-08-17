"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getOrCreateDay } from "@/lib/planner/days";
import { addDays } from "@/lib/date/week";

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveWeeklyReview(
  weekId: string,
  fields: Partial<{
    wentWell: string;
    didntGoWell: string;
    learned: string;
    changeNextWeek: string;
    proudOf: string;
    carryForward: string;
  }>
) {
  const { userId } = await verifySession();
  const week = await db.week.findFirst({ where: { id: weekId, userId } });
  if (!week) throw new Error("Week not found.");

  await db.weeklyReview.upsert({
    where: { weekId },
    update: fields,
    create: { userId, weekId, ...fields },
  });
  refresh();
}

async function ownedTaskWithUserOrThrow(taskId: string, userId: string) {
  const task = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new Error("Task not found.");
  return task;
}

// §42 "Start New Week": incomplete tasks are never silently carried forward — the
// user picks one of three explicit dispositions, each a distinct action here.
export async function moveTaskToNextWeek(taskId: string) {
  const { userId } = await verifySession();
  const task = await ownedTaskWithUserOrThrow(taskId, userId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const currentWeek = task.weekId ? await db.week.findUnique({ where: { id: task.weekId } }) : null;
  const anchorDate = currentWeek ? addDays(currentWeek.startDate, 7) : addDays(new Date().toISOString().slice(0, 10), 7);
  const nextWeek = await getOrCreateWeek(userId, anchorDate, user.weekStartsOn);

  const inboxCount = await db.task.count({ where: { userId, weekId: nextWeek.id, dayId: null } });
  await db.task.update({
    where: { id: taskId },
    data: { weekId: nextWeek.id, dayId: null, dailyPriorityRank: null, sortOrder: inboxCount },
  });
  refresh();
}

export async function rescheduleTaskToDate(taskId: string, targetDateKey: string) {
  const { userId } = await verifySession();
  await ownedTaskWithUserOrThrow(taskId, userId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const targetDay = await getOrCreateDay(userId, targetDateKey, user.weekStartsOn);
  const dayCount = await db.task.count({ where: { userId, dayId: targetDay.id } });

  await db.task.update({
    where: { id: taskId },
    data: { weekId: targetDay.weekId, dayId: targetDay.id, dailyPriorityRank: null, sortOrder: dayCount },
  });
  refresh();
}

export async function archiveTask(taskId: string) {
  const { userId } = await verifySession();
  await ownedTaskWithUserOrThrow(taskId, userId);
  await db.task.update({ where: { id: taskId }, data: { status: "ARCHIVED", dailyPriorityRank: null } });
  refresh();
}
