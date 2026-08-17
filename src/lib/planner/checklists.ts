import "server-only";
import { db } from "@/lib/db";
import { upsertOrFetch } from "@/lib/planner/upsertOrFetch";

export async function getOrCreateWeeklyChecklist(userId: string, weekId: string) {
  const where = { userId_weekId: { userId, weekId } };
  const include = { items: { orderBy: { sortOrder: "asc" as const } } };

  return upsertOrFetch(
    () => db.checklist.upsert({ where, update: {}, create: { userId, weekId, scope: "WEEK", title: "Weekly checklist" }, include }),
    () => db.checklist.findUniqueOrThrow({ where, include })
  );
}
