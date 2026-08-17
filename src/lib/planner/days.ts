import "server-only";
import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { Weekday } from "@/generated/prisma/enums";
import { upsertOrFetch } from "@/lib/planner/upsertOrFetch";

export async function getOrCreateDay(userId: string, dateKey: string, weekStartsOn: Weekday) {
  const week = await getOrCreateWeek(userId, dateKey, weekStartsOn);
  const where = { userId_date: { userId, date: dateKey } };

  return upsertOrFetch(
    () => db.day.upsert({ where, update: {}, create: { userId, date: dateKey, weekId: week.id } }),
    () => db.day.findUniqueOrThrow({ where })
  );
}
