import "server-only";
import { db } from "@/lib/db";
import { getWeekStart, getWeekEnd } from "@/lib/date/week";
import { Weekday } from "@/generated/prisma/enums";
import { upsertOrFetch } from "@/lib/planner/upsertOrFetch";

// Weeks (and days, in days.ts) are created lazily on first visit rather than
// pre-populated — §41 "smart defaults" happens here, at read time, instead of a cron
// job pre-seeding a calendar.
export async function getOrCreateWeek(userId: string, anyDateInWeek: string, weekStartsOn: Weekday) {
  const startDate = getWeekStart(anyDateInWeek, weekStartsOn);
  const endDate = getWeekEnd(anyDateInWeek, weekStartsOn);
  const where = { userId_startDate: { userId, startDate } };

  return upsertOrFetch(
    () => db.week.upsert({ where, update: {}, create: { userId, startDate, endDate } }),
    () => db.week.findUniqueOrThrow({ where })
  );
}
