import { db } from "@/lib/db";
import { getOrCreateDay } from "@/lib/planner/days";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const { id: taskId } = await params;
  const task = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!task) return jsonResponse({ error: "Task not found." }, 404);

  const body = await req.json().catch(() => null);
  const targetDateKey = body?.date;
  if (typeof targetDateKey !== "string" || !isValidDateKey(targetDateKey)) {
    return jsonResponse({ error: "A valid target date is required." }, 400);
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const targetDay = await getOrCreateDay(userId, targetDateKey, user.weekStartsOn);
  const dayCount = await db.task.count({ where: { userId, dayId: targetDay.id } });

  await db.task.update({
    where: { id: taskId },
    data: { weekId: targetDay.weekId, dayId: targetDay.id, dailyPriorityRank: null, sortOrder: dayCount },
  });

  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
