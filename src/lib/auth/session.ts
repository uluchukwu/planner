import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";

const COOKIE_NAME = "planner_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Database-backed sessions: the cookie (web) or bearer token (mobile) only ever
// carries an opaque random token. Nothing about the user is derivable from the token
// itself, and a session can be revoked server-side at any time by deleting its row.
// Both auth surfaces share the exact same Session table and hashing — a mobile login
// and a web login are indistinguishable rows, just handed to the client differently.
export async function createSessionToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  return { token, expiresAt };
}

export async function createSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSessionToken(userId);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

async function userIdForToken(token: string): Promise<string | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return session.userId;
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return userIdForToken(token);
}

export async function getSessionUserIdForToken(token: string): Promise<string | null> {
  return userIdForToken(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(COOKIE_NAME);
}
