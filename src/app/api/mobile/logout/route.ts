import { deleteSessionForToken } from "@/lib/auth/session";
import { jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

// Deliberately doesn't go through requireMobileUser: that only returns a userId, but
// revoking sign-out must delete this one device's session row specifically, not every
// session belonging to the user. The raw bearer token is what identifies that row.
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

  await deleteSessionForToken(token);
  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
