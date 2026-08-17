import { db } from "@/lib/db";
import { computeGoalProgress } from "@/lib/progress";
import { todayKey } from "@/lib/date/week";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";
import { GoalLevel } from "@/generated/prisma/enums";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const monthKey = url.searchParams.get("month") ?? todayKey().slice(0, 7);

  const [yearGoals, monthGoals] = await Promise.all([
    db.goal.findMany({
      where: { userId, level: "YEAR", yearKey: year },
      include: { tasks: { select: { status: true } } },
      orderBy: [{ isPriority: "desc" }, { createdAt: "asc" }],
    }),
    db.goal.findMany({
      where: { userId, level: "MONTH", monthKey },
      include: { tasks: { select: { status: true } }, parent: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return jsonResponse({
    year,
    monthKey,
    yearGoals: yearGoals.map((g) => ({ id: g.id, title: g.title, isPriority: g.isPriority, progress: computeGoalProgress(g) })),
    monthGoals: monthGoals.map((g) => ({
      id: g.id,
      title: g.title,
      progress: computeGoalProgress(g),
      parentTitle: g.parent?.title ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const level = body?.level as GoalLevel;
  if (!title) return jsonResponse({ error: "Goal title can't be empty." }, 400);
  if (!["YEAR", "MONTH", "WEEK"].includes(level)) return jsonResponse({ error: "Invalid goal level." }, 400);
  if (level === "WEEK" && !body?.weekId) return jsonResponse({ error: "A weekly goal needs a weekId." }, 400);

  const goal = await db.goal.create({
    data: {
      userId,
      level,
      title,
      yearKey: level === "YEAR" ? Number(body?.yearKey ?? new Date().getFullYear()) : null,
      monthKey: level === "MONTH" ? String(body?.monthKey ?? todayKey().slice(0, 7)) : null,
      weekId: level === "WEEK" ? String(body.weekId) : null,
      parentId: body?.parentId ? String(body.parentId) : null,
    },
  });

  return jsonResponse({ id: goal.id, title: goal.title });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
