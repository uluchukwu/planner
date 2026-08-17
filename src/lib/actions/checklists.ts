"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";

function refresh() {
  revalidatePath("/", "layout");
}

export async function addChecklistItem(checklistId: string, label: string) {
  const { userId } = await verifySession();
  const checklist = await db.checklist.findFirst({ where: { id: checklistId, userId } });
  if (!checklist) throw new Error("Checklist not found.");
  const trimmed = label.trim();
  if (!trimmed) return { error: "Item can't be empty." };

  const count = await db.checklistItem.count({ where: { checklistId } });
  await db.checklistItem.create({ data: { userId, checklistId, label: trimmed, sortOrder: count } });
  refresh();
}

export async function toggleChecklistItem(itemId: string) {
  const { userId } = await verifySession();
  const item = await db.checklistItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new Error("Checklist item not found.");
  await db.checklistItem.update({
    where: { id: itemId },
    data: { completed: !item.completed, completedAt: !item.completed ? new Date() : null },
  });
  refresh();
}

export async function deleteChecklistItem(itemId: string) {
  const { userId } = await verifySession();
  const item = await db.checklistItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new Error("Checklist item not found.");
  await db.checklistItem.delete({ where: { id: itemId } });
  refresh();
}
