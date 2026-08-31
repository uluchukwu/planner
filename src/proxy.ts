import { NextRequest, NextResponse } from "next/server";

// Optimistic auth check only (cookie presence, not DB-verified) — real authorization
// happens in the Data Access Layer (see lib/auth/dal.ts) on every protected page and
// server action. This only redirects the "definitely logged out" direction: a stale
// cookie that no longer matches a live DB session must NOT bounce the user away from
// /login here too, or an expired cookie creates a login <-> today redirect loop (the
// DAL sends it to /login, this would optimistically send it back). The login/signup
// pages do their own DB-verified redirect for already-authenticated visitors instead.
const COOKIE_NAME = "planner_session";
const PUBLIC_ROUTES = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(COOKIE_NAME);

  if (!hasSession && !PUBLIC_ROUTES.has(pathname) && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon).*)"],
};
