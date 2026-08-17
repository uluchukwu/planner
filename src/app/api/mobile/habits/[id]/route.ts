import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

async function ownedHabitOrNull(habitId: string, userId: string) {
  return db.habit.findFirst({ where: { id: habitId, userId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const habit = await ownedHabitOrNull(id, auth.userId);
  if (!habit) return jsonResponse({ error: "Habit not found." }, 404);

  const body = await req.json().catch(() => null);
  if (typeof body?.archived !== "boolean") return jsonResponse({ error: "Expected { archived: boolean }." }, 400);

  const updated = await db.habit.update({ where: { id }, data: { archived: body.archived } });
  return jsonResponse({ id: updated.id, archived: updated.archived });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const habit = await ownedHabitOrNull(id, auth.userId);
  if (!habit) return jsonResponse({ error: "Habit not found." }, 404);

  await db.habit.delete({ where: { id } });
  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
