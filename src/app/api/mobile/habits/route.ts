import { db } from "@/lib/db";
import { todayKey, getWeekDays, daysElapsedInMonth } from "@/lib/date/week";
import { computeCurrentStreak, countCompletionsInRange } from "@/lib/habits";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const today = todayKey();
  const weekDateKeys = getWeekDays(today, user.weekStartsOn);
  const monthDateKeys = daysElapsedInMonth(today);

  const habits = await db.habit.findMany({
    where: { userId },
    include: { completions: { select: { date: true } } },
    orderBy: { createdAt: "asc" },
  });

  return jsonResponse(
    habits.map((h) => {
      const dates = new Set(h.completions.map((c) => c.date));
      return {
        id: h.id,
        name: h.name,
        archived: h.archived,
        currentStreak: computeCurrentStreak(dates, today),
        weekCompletions: countCompletionsInRange(dates, weekDateKeys),
        monthlyCompletionPct: Math.round((countCompletionsInRange(dates, monthDateKeys) / monthDateKeys.length) * 100),
        completedToday: dates.has(today),
      };
    })
  );
}

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return jsonResponse({ error: "Habit name can't be empty." }, 400);

  const habit = await db.habit.create({ data: { userId, name } });
  return jsonResponse({ id: habit.id, name: habit.name });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
