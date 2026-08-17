import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { addDays } from "@/lib/date/week";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

// §42 "Start New Week": incomplete tasks are never silently carried forward — the
// user picks one of three explicit dispositions, each a distinct route here.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const { id: taskId } = await params;
  const task = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!task) return jsonResponse({ error: "Task not found." }, 404);

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const currentWeek = task.weekId ? await db.week.findUnique({ where: { id: task.weekId } }) : null;
  const anchorDate = currentWeek ? addDays(currentWeek.startDate, 7) : addDays(new Date().toISOString().slice(0, 10), 7);
  const nextWeek = await getOrCreateWeek(userId, anchorDate, user.weekStartsOn);

  const inboxCount = await db.task.count({ where: { userId, weekId: nextWeek.id, dayId: null } });
  await db.task.update({
    where: { id: taskId },
    data: { weekId: nextWeek.id, dayId: null, dailyPriorityRank: null, sortOrder: inboxCount },
  });

  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
