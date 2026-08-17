"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";

export async function updateDayFields(dayId: string, fields: Partial<{ challenge: string | null; objective: string | null }>) {
  const { userId } = await verifySession();
  const day = await db.day.findFirst({ where: { id: dayId, userId } });
  if (!day) throw new Error("Day not found.");
  await db.day.update({ where: { id: dayId }, data: fields });
  revalidatePath("/", "layout");
}
