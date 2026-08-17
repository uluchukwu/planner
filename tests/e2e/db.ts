import pg from "pg";

// A raw pg client, deliberately bypassing the app's own Prisma layer, so these
// assertions read what the database actually holds rather than trusting the same
// code path being tested. Used sparingly — only where a UI-level assertion can't
// distinguish "worked" from "looked like it worked" (see priority-limits.spec.ts).
export function connectTestDb() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  return client;
}
