import "server-only";
import { getSessionUserIdForToken } from "@/lib/auth/session";

// Mobile API routes can't use cookies() the way pages/Server Actions do — Expo has
// no first-party cookie jar across native + web targets — so the client sends the
// same opaque session token as a Bearer header instead. Same Session table, same
// hashing, same expiry check as the cookie path; only where the token comes from differs.
export async function requireMobileUser(req: Request): Promise<{ userId: string } | Response> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return unauthorized();

  const userId = await getSessionUserIdForToken(token);
  if (!userId) return unauthorized();

  return { userId };
}

function unauthorized(): Response {
  return jsonResponse({ error: "Unauthorized" }, 401);
}

// Dev-appropriate CORS for the Expo web target, which runs on a different origin/port
// than this Next.js server. Native iOS/Android builds don't enforce CORS at all, so
// this only matters for `expo start --web`. A wildcard origin is safe to use here
// specifically because auth is a Bearer token the client must already possess, not an
// ambient cookie — there's no session to "ride" cross-origin the way there would be
// with cookie-based auth. Not hardened beyond that for a public deployment.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
