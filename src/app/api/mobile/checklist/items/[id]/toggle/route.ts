import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const item = await db.checklistItem.findFirst({ where: { id, userId: auth.userId } });
  if (!item) return jsonResponse({ error: "Checklist item not found." }, 404);

  const updated = await db.checklistItem.update({
    where: { id },
    data: { completed: !item.completed, completedAt: !item.completed ? new Date() : null },
  });
  return jsonResponse({ id: updated.id, completed: updated.completed });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
