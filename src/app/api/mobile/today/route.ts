import { db } from "@/lib/db";
import { getOrCreateDay } from "@/lib/planner/days";
import { todayKey, formatDateLong } from "@/lib/date/week";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const date = todayKey();
  const day = await getOrCreateDay(userId, date, user.weekStartsOn);

  const tasks = await db.task.findMany({
    where: { userId, dayId: day.id, status: { not: "ARCHIVED" } },
    orderBy: [{ sortOrder: "asc" }],
  });

  return jsonResponse({
    date,
    dateLabel: formatDateLong(date),
    challenge: day.challenge,
    objective: day.objective,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      completed: t.status === "COMPLETED",
      dailyPriorityRank: t.dailyPriorityRank,
    })),
  });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
