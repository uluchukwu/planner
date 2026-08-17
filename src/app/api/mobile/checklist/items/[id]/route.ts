import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

async function ownedItemOrNull(itemId: string, userId: string) {
  return db.checklistItem.findFirst({ where: { id: itemId, userId } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const item = await ownedItemOrNull(id, auth.userId);
  if (!item) return jsonResponse({ error: "Checklist item not found." }, 404);

  await db.checklistItem.delete({ where: { id } });
  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
