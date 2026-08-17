import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

// Memoized per-request: safe to call verifySession()/getCurrentUser() from many
// components on the same page without issuing duplicate DB lookups.
export const verifySession = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }
  return { userId };
});

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    redirect("/login");
  }
  return user;
});

// Non-redirecting variant for places (like the root page) that branch on auth state.
export const getOptionalUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
});
