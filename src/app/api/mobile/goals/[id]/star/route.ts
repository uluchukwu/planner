import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

// The year-goal "most important" star (isPriority) — unranked, uncapped, and
// distinct from the weekly 4-goal hard limit handled by lib/core/weeklyPriority.ts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const goal = await db.goal.findFirst({ where: { id, userId: auth.userId } });
  if (!goal) return jsonResponse({ error: "Goal not found." }, 404);

  const updated = await db.goal.update({ where: { id }, data: { isPriority: !goal.isPriority } });
  return jsonResponse({ id: updated.id, isPriority: updated.isPriority });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
