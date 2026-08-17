"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { HabitFrequency } from "@/generated/prisma/enums";

function refresh() {
  revalidatePath("/", "layout");
}

async function ownedHabitOrThrow(habitId: string, userId: string) {
  const habit = await db.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new Error("Habit not found.");
  return habit;
}

export async function createHabit(input: { name: string; frequency?: HabitFrequency; target?: number }) {
  const { userId } = await verifySession();
  const name = input.name.trim();
  if (!name) return { error: "Habit name can't be empty." };

  await db.habit.create({
    data: { userId, name, frequency: input.frequency ?? "DAILY", target: input.target ?? 7 },
  });
  refresh();
}

export async function updateHabit(habitId: string, fields: Partial<{ name: string; frequency: HabitFrequency; target: number; archived: boolean }>) {
  const { userId } = await verifySession();
  await ownedHabitOrThrow(habitId, userId);
  await db.habit.update({ where: { id: habitId }, data: fields });
  refresh();
}

export async function deleteHabit(habitId: string) {
  const { userId } = await verifySession();
  await ownedHabitOrThrow(habitId, userId);
  await db.habit.delete({ where: { id: habitId } });
  refresh();
}

// HabitCompletion has no userId column of its own — ownership is only reachable
// through the parent Habit, so every read/write here must go through it first.
export async function toggleHabitCompletion(habitId: string, dateKey: string) {
  const { userId } = await verifySession();
  await ownedHabitOrThrow(habitId, userId);

  const existing = await db.habitCompletion.findUnique({ where: { habitId_date: { habitId, date: dateKey } } });
  if (existing) {
    await db.habitCompletion.delete({ where: { id: existing.id } });
  } else {
    await db.habitCompletion.create({ data: { habitId, date: dateKey } });
  }
  refresh();
}
