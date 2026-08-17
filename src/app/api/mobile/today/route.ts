import { db } from "@/lib/db";
import { getOrCreateDay } from "@/lib/planner/days";
import { todayKey, formatDateLong } from "@/lib/date/week";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

// Path kept as /today (not renamed to /day) so the existing mobile client code and
// this session's earlier verification pass stay valid — ?date= just extends it to any
// day, defaulting to today when omitted, which is what day navigation needs.
export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isValidDateKey(dateParam) ? dateParam : todayKey();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const day = await getOrCreateDay(userId, date, user.weekStartsOn);

  const tasks = await db.task.findMany({
    where: { userId, dayId: day.id, status: { not: "ARCHIVED" } },
    orderBy: [{ sortOrder: "asc" }],
  });

  return jsonResponse({
    date,
    dateLabel: formatDateLong(date),
    isToday: date === todayKey(),
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

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const dateParam = body?.date;
  if (!title) return jsonResponse({ error: "Task title can't be empty." }, 400);
  const date = typeof dateParam === "string" && isValidDateKey(dateParam) ? dateParam : todayKey();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const day = await getOrCreateDay(userId, date, user.weekStartsOn);
  if (!day.weekId) return jsonResponse({ error: "Day isn't attached to a week." }, 400);

  const siblingCount = await db.task.count({ where: { userId, weekId: day.weekId, dayId: day.id } });
  const task = await db.task.create({
    data: { userId, title, weekId: day.weekId, dayId: day.id, sortOrder: siblingCount },
  });

  return jsonResponse({ id: task.id, title: task.title, completed: false, dailyPriorityRank: null });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
