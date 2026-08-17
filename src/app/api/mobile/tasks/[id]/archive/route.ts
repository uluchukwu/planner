import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const { id: taskId } = await params;
  const task = await db.task.findFirst({ where: { id: taskId, userId } });
  if (!task) return jsonResponse({ error: "Task not found." }, 404);

  await db.task.update({ where: { id: taskId }, data: { status: "ARCHIVED", dailyPriorityRank: null } });

  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
