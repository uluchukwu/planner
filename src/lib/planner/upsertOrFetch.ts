import "server-only";
import { Prisma } from "@/generated/prisma/client";

// Postgres's INSERT ... ON CONFLICT DO UPDATE is atomic per-statement, but a P2002 was
// observed coming out of day.upsert() under dev-server load (exact trigger not pinned
// down — root cause wasn't isolated, only the symptom). If it fires, the row was
// created by whichever request won the race, so re-fetching it is correct either way.
export async function upsertOrFetch<T>(upsert: () => Promise<T>, refetch: () => Promise<T>): Promise<T> {
  try {
    return await upsert();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return refetch();
    }
    throw e;
  }
}
