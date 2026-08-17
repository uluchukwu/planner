import { db } from "@/lib/db";
import { todayKey } from "@/lib/date/week";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

// HabitCompletion has no userId column of its own — ownership is only reachable
// through the parent Habit, same constraint as the web action (lib/actions/habits.ts).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id: habitId } = await params;

  const habit = await db.habit.findFirst({ where: { id: habitId, userId: auth.userId } });
  if (!habit) return jsonResponse({ error: "Habit not found." }, 404);

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isValidDateKey(dateParam) ? dateParam : todayKey();

  const existing = await db.habitCompletion.findUnique({ where: { habitId_date: { habitId, date } } });
  if (existing) {
    await db.habitCompletion.delete({ where: { id: existing.id } });
    return jsonResponse({ date, completed: false });
  }
  await db.habitCompletion.create({ data: { habitId, date } });
  return jsonResponse({ date, completed: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
