import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

async function ownedGoalOrNull(goalId: string, userId: string) {
  return db.goal.findFirst({ where: { id: goalId, userId } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const goal = await ownedGoalOrNull(id, auth.userId);
  if (!goal) return jsonResponse({ error: "Goal not found." }, 404);

  await db.goal.delete({ where: { id } });
  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
