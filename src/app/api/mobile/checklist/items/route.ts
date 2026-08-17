import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => null);
  const checklistId = String(body?.checklistId ?? "");
  const label = String(body?.label ?? "").trim();
  if (!label) return jsonResponse({ error: "Item can't be empty." }, 400);

  const checklist = await db.checklist.findFirst({ where: { id: checklistId, userId } });
  if (!checklist) return jsonResponse({ error: "Checklist not found." }, 404);

  const count = await db.checklistItem.count({ where: { checklistId } });
  const item = await db.checklistItem.create({ data: { userId, checklistId, label, sortOrder: count } });

  return jsonResponse({ id: item.id, label: item.label, completed: item.completed });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
