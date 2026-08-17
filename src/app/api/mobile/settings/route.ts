import { db } from "@/lib/db";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";
import { Weekday, ThemePreference } from "@/generated/prisma/enums";

const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const THEMES: ThemePreference[] = ["LIGHT", "DARK", "SYSTEM"];

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  return jsonResponse({
    name: user.name ?? "",
    email: user.email,
    weekStartsOn: user.weekStartsOn,
    currency: user.currency,
    theme: user.theme,
    defaultWorkStartHour: user.defaultWorkStartHour,
    defaultWorkEndHour: user.defaultWorkEndHour,
    notificationsEnabled: user.notificationsEnabled,
  });
}

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => null);
  if (!body) return jsonResponse({ error: "Invalid request body." }, 400);

  const name = String(body.name ?? "").trim();
  if (!name) return jsonResponse({ error: "Name can't be empty." }, 400);

  if (!WEEKDAYS.includes(body.weekStartsOn)) return jsonResponse({ error: "Invalid week start day." }, 400);
  if (!THEMES.includes(body.theme)) return jsonResponse({ error: "Invalid theme." }, 400);

  const startHour = Number(body.defaultWorkStartHour);
  const endHour = Number(body.defaultWorkEndHour);
  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    return jsonResponse({ error: "Working hours start must be between 0 and 23." }, 400);
  }
  if (!Number.isInteger(endHour) || endHour < 1 || endHour > 24) {
    return jsonResponse({ error: "Working hours end must be between 1 and 24." }, 400);
  }

  const currency = String(body.currency ?? "USD").toUpperCase().slice(0, 3);
  if (!/^[A-Z]{3}$/.test(currency)) return jsonResponse({ error: "Currency must be a 3-letter ISO code." }, 400);

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      weekStartsOn: body.weekStartsOn,
      currency,
      theme: body.theme,
      defaultWorkStartHour: startHour,
      defaultWorkEndHour: endHour,
      notificationsEnabled: Boolean(body.notificationsEnabled),
    },
  });

  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
