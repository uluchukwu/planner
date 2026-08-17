import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const expense = await db.expense.findFirst({ where: { id, userId: auth.userId } });
  if (!expense) return jsonResponse({ error: "Expense not found." }, 404);

  await db.expense.delete({ where: { id } });
  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
