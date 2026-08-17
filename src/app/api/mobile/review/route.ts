import { db } from "@/lib/db";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getWeekDays, weekdayOf, WEEKDAY_LABELS, formatDateShort, formatWeekRange, addDays, todayKey } from "@/lib/date/week";
import { computeGoalProgress, computeCompletionRate } from "@/lib/progress";
import { countCompletionsInRange } from "@/lib/habits";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isValidDateKey(dateParam) ? dateParam : todayKey();

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const week = await getOrCreateWeek(userId, date, user.weekStartsOn);
  const dateKeys = getWeekDays(date, user.weekStartsOn);

  // Deliberately unfiltered by status (unlike the planner views) — mirrors the web
  // review page: archiving an incomplete task during triage shouldn't retroactively
  // shrink "planned" and inflate the completion rate.
  const [allTasks, weekGoals, existingReview, activeHabits] = await Promise.all([
    db.task.findMany({ where: { userId, weekId: week.id } }),
    db.goal.findMany({
      where: { userId, weekId: week.id },
      include: { tasks: { select: { status: true } } },
      orderBy: [{ weeklyPriorityRank: "asc" }, { createdAt: "asc" }],
    }),
    db.weeklyReview.findUnique({ where: { weekId: week.id } }),
    db.habit.findMany({ where: { userId, archived: false }, include: { completions: { select: { date: true } } } }),
  ]);

  const planned = allTasks.length;
  const completed = allTasks.filter((t) => t.status === "COMPLETED").length;
  const incompleteTasks = allTasks.filter((t) => t.status === "PENDING").map((t) => ({ id: t.id, title: t.title }));

  const habitAverages = activeHabits.map((h) => {
    const dates = new Set(h.completions.map((c) => c.date));
    return Math.round((countCompletionsInRange(dates, dateKeys) / 7) * 100);
  });
  const habitsAvgCompletion = habitAverages.length ? Math.round(habitAverages.reduce((a, b) => a + b, 0) / habitAverages.length) : null;

  const nextWeekStart = addDays(dateKeys[0], 7);
  const nextWeekDateKeys = getWeekDays(nextWeekStart, user.weekStartsOn);

  return jsonResponse({
    weekId: week.id,
    weekLabel: formatWeekRange(dateKeys[0], dateKeys[6]),
    planned,
    completed,
    completionRate: computeCompletionRate(planned, completed),
    habitsAvgCompletion,
    goals: weekGoals.map((g) => ({ id: g.id, title: g.title, progress: computeGoalProgress(g) })),
    incompleteTasks,
    nextWeekDays: nextWeekDateKeys.map((key) => ({
      dateKey: key,
      label: `${WEEKDAY_LABELS[weekdayOf(key)]} ${formatDateShort(key)}`,
    })),
    review: {
      wentWell: existingReview?.wentWell ?? "",
      didntGoWell: existingReview?.didntGoWell ?? "",
      learned: existingReview?.learned ?? "",
      changeNextWeek: existingReview?.changeNextWeek ?? "",
      proudOf: existingReview?.proudOf ?? "",
      carryForward: existingReview?.carryForward ?? "",
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => null);
  const weekId = String(body?.weekId ?? "");
  if (!weekId) return jsonResponse({ error: "weekId is required." }, 400);

  const week = await db.week.findFirst({ where: { id: weekId, userId } });
  if (!week) return jsonResponse({ error: "Week not found." }, 404);

  const fields = {
    wentWell: String(body?.wentWell ?? ""),
    didntGoWell: String(body?.didntGoWell ?? ""),
    learned: String(body?.learned ?? ""),
    changeNextWeek: String(body?.changeNextWeek ?? ""),
    proudOf: String(body?.proudOf ?? ""),
    carryForward: String(body?.carryForward ?? ""),
  };

  await db.weeklyReview.upsert({
    where: { weekId },
    update: fields,
    create: { userId, weekId, ...fields },
  });

  return jsonResponse({ ok: true });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
