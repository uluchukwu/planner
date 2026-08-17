"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";

function refresh() {
  revalidatePath("/", "layout");
}

export async function createTimeBlock(input: {
  dayId: string;
  taskId?: string | null;
  title: string;
  startMinutes: number;
  endMinutes: number;
}) {
  const { userId } = await verifySession();
  const day = await db.day.findFirst({ where: { id: input.dayId, userId } });
  if (!day) throw new Error("Day not found.");
  if (input.endMinutes <= input.startMinutes) {
    return { error: "End time must be after start time." };
  }

  await db.timeBlock.create({
    data: {
      userId,
      dayId: input.dayId,
      taskId: input.taskId ?? null,
      title: input.title.trim() || "Untitled block",
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
    },
  });
  refresh();
}

export async function updateTimeBlock(
  id: string,
  fields: Partial<{ title: string; startMinutes: number; endMinutes: number; taskId: string | null }>
) {
  const { userId } = await verifySession();
  const block = await db.timeBlock.findFirst({ where: { id, userId } });
  if (!block) throw new Error("Time block not found.");
  if (
    fields.startMinutes !== undefined &&
    fields.endMinutes !== undefined &&
    fields.endMinutes <= fields.startMinutes
  ) {
    return { error: "End time must be after start time." };
  }

  await db.timeBlock.update({ where: { id }, data: fields });
  refresh();
}

export async function deleteTimeBlock(id: string) {
  const { userId } = await verifySession();
  const block = await db.timeBlock.findFirst({ where: { id, userId } });
  if (!block) throw new Error("Time block not found.");
  await db.timeBlock.delete({ where: { id } });
  refresh();
}
