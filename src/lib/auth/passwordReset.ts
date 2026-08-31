import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes — short-lived and single-use, unlike a session

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Any previous outstanding token for this user is invalidated first, so requesting a
// new reset link (e.g. because the first email never arrived) can't leave two valid
// links active at once.
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.passwordResetToken.deleteMany({ where: { userId } });
  await db.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });

  return token;
}

// Single-use: the row is deleted the moment it's read here, whether or not the
// caller goes on to actually change the password, so a link can never be replayed.
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) return null;

  await db.passwordResetToken.delete({ where: { id: record.id } });
  if (record.expiresAt < new Date()) return null;

  return record.userId;
}
