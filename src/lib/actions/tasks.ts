"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { TaskPriority } from "@/generated/prisma/enums";

const MAX_DAILY_PRIORITIES = 3;

function refresh() {
  revalidatePath("/", "layout");
}

async function ownedTaskOrThrow(taskId: string, userId: string) {
  const task = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new Error("Task not found.");
  return task;
}

export async function createTask(input: {
  title: string;
  weekId: string;
  dayId?: string | null;
  goalId?: string | null;
  category?: string | null;
  priority?: TaskPriority | null;
  estimatedMinutes?: number | null;
  dueTime?: string | null;
  notes?: string | null;
}) {
  const { userId } = await verifySession();
  const title = input.title.trim();
  if (!title) return { error: "Task title can't be empty." };

  const siblingCount = await db.task.count({
    where: { userId, weekId: input.weekId, dayId: input.dayId ?? null },
  });

  await db.task.create({
    data: {
      userId,
      title,
      weekId: input.weekId,
      dayId: input.dayId ?? null,
      goalId: input.goalId ?? null,
      category: input.category ?? null,
      priority: input.priority ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      dueTime: input.dueTime ?? null,
      notes: input.notes ?? null,
      sortOrder: siblingCount,
    },
  });
  refresh();
}

export async function updateTask(
  taskId: string,
  fields: Partial<{
    title: string;
    notes: string | null;
    category: string | null;
    priority: TaskPriority | null;
    estimatedMinutes: number | null;
    dueTime: string | null;
    goalId: string | null;
  }>
) {
  const { userId } = await verifySession();
  await ownedTaskOrThrow(taskId, userId);
  await db.task.update({ where: { id: taskId }, data: fields });
  refresh();
}

export async function toggleTaskComplete(taskId: string) {
  const { userId } = await verifySession();
  const task = await ownedTaskOrThrow(taskId, userId);
  const nowCompleted = task.status !== "COMPLETED";
  await db.task.update({
    where: { id: taskId },
    data: {
      status: nowCompleted ? "COMPLETED" : "PENDING",
      completedAt: nowCompleted ? new Date() : null,
    },
  });
  refresh();
}

export async function deleteTask(taskId: string) {
  const { userId } = await verifySession();
  await ownedTaskOrThrow(taskId, userId);
  await db.task.delete({ where: { id: taskId } });
  refresh();
}

// Moves a task between the weekly Inbox (dayId = null) and a specific day — the
// server-side counterpart of the drag-and-drop interaction in §8.
export async function moveTask(taskId: string, targetDayId: string | null) {
  const { userId } = await verifySession();
  const task = await ownedTaskOrThrow(taskId, userId);

  const siblingCount = await db.task.count({
    where: { userId, weekId: task.weekId, dayId: targetDayId },
  });

  await db.task.update({
    where: { id: taskId },
    data: {
      dayId: targetDayId,
      sortOrder: siblingCount,
      // Leaving a day clears any daily-priority slot it held there.
      dailyPriorityRank: targetDayId === task.dayId ? task.dailyPriorityRank : null,
    },
  });
  refresh();
}

// Persists a column's new task order after a drag-and-drop reorder.
export async function reorderColumn(weekId: string, dayId: string | null, orderedTaskIds: string[]) {
  const { userId } = await verifySession();
  const tasks = await db.task.findMany({
    where: { userId, weekId, dayId, id: { in: orderedTaskIds } },
    select: { id: true },
  });
  const validIds = new Set(tasks.map((t) => t.id));

  await db.$transaction(
    orderedTaskIds
      .filter((id) => validIds.has(id))
      .map((id, index) =>
        db.task.update({ where: { id }, data: { sortOrder: index } })
      )
  );
  refresh();
}

// Enforces the non-negotiable "max 3 daily priorities" rule (§40) inside a
// transaction so a race between two tabs can't create a 4th.
export async function toggleDailyPriority(taskId: string) {
  const { userId } = await verifySession();
  const task = await ownedTaskOrThrow(taskId, userId);
  if (!task.dayId) return { error: "Assign this task to a day first." };

  return db.$transaction(async (tx) => {
    if (task.dailyPriorityRank !== null) {
      await tx.task.update({ where: { id: taskId }, data: { dailyPriorityRank: null } });
      refresh();
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
    refresh();
    return {};
  });
}
