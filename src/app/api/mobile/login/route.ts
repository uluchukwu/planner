import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";
import { credentialsSchema } from "@/lib/validation/auth";
import { jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, 400);
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return jsonResponse({ error: "Incorrect email or password." }, 401);
  }

  const { token, expiresAt } = await createSessionToken(user.id);
  return jsonResponse({
    token,
    expiresAt: expiresAt.toISOString(),
    user: { id: user.id, name: user.name, email: user.email },
  });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
