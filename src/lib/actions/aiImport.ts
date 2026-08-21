"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { getOrCreateWeek } from "@/lib/planner/weeks";
import { getOrCreateDay } from "@/lib/planner/days";
import { nextOpenDailyPriorityRanks } from "@/lib/core/dailyPriority";
import { todayKey } from "@/lib/date/week";
import { ParsedPlanSchema, type ParsedPlan } from "@/lib/ai/plan";

const MAX_INPUT_CHARS = 20000;

export type ParsePlanResult =
  | { error: string }
  | {
      plan: ParsedPlan;
      // Days the plan wants to touch that already have tasks in this account —
      // informational only; the actual Top-3 cap is re-checked for real at commit
      // time via nextOpenDailyPriorityRanks, this is just so the preview isn't a surprise.
      daysWithExistingTasks: string[];
    };

export async function parsePlanWithAI(rawText: string): Promise<ParsePlanResult> {
  const { userId } = await verifySession();
  const text = rawText.trim();
  if (!text) return { error: "Paste a plan first." };
  if (text.length > MAX_INPUT_CHARS) {
    return { error: `That's ${text.length} characters — try splitting it into smaller chunks (e.g. one month at a time). Limit is ${MAX_INPUT_CHARS}.` };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "AI import isn't configured yet — add ANTHROPIC_API_KEY to the server's .env file and restart the dev server." };
  }

  const client = new Anthropic();

  let parsedOutput: ParsedPlan | null;
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system:
        `You turn a user's freeform study/work/personal plan into structured daily planner data. Today's date is ${todayKey()}. ` +
        "Resolve every date the plan describes -- whether absolute (\"August 22\") or relative (\"Day 3\", \"next Monday\") -- into an explicit ISO YYYY-MM-DD date. Never leave a date ambiguous, and never omit a day the plan clearly covers. " +
        "Preserve the plan's own specific content: do not invent activities it didn't mention, do not merge multiple distinct days into one entry, and do not replace specific tasks with generic placeholders. " +
        "Mark at most 3 tasks per day as isPriority: true -- when the source lists more than 3 things for a day, pick only that day's single most important 1-3 items; the rest still get created as regular (non-priority) tasks, never dropped.",
      messages: [{ role: "user", content: text }],
      output_config: { format: zodOutputFormat(ParsedPlanSchema) },
    });
    parsedOutput = response.parsed_output;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: "The server's Anthropic API key is invalid." };
    if (e instanceof Anthropic.RateLimitError) return { error: "Rate limited by the AI provider — try again shortly." };
    if (e instanceof Anthropic.APIError) return { error: `AI request failed: ${e.message}` };
    return { error: "Something went wrong parsing the plan." };
  }

  if (!parsedOutput) {
    return { error: "The AI couldn't structure that plan reliably. Try rephrasing it with clearer dates, or paste a smaller chunk." };
  }

  const existingDays = await db.day.findMany({
    where: { userId, date: { in: parsedOutput.days.map((d) => d.date) } },
    select: { date: true, tasks: { select: { id: true }, take: 1 } },
  });
  const daysWithExistingTasks = existingDays.filter((d) => d.tasks.length > 0).map((d) => d.date);

  return { plan: parsedOutput, daysWithExistingTasks };
}

export async function commitParsedPlan(planInput: ParsedPlan): Promise<{ error?: string; daysTouched?: number; tasksCreated?: number; habitsCreated?: number }> {
  const { userId } = await verifySession();
  const parsed = ParsedPlanSchema.safeParse(planInput);
  if (!parsed.success) return { error: "That plan data looks malformed — please re-parse it." };
  const { planTitle, days, habits } = parsed.data;

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const goal = await db.goal.create({
    data: {
      userId,
      level: "YEAR",
      title: planTitle,
      category: "PERSONAL",
      yearKey: new Date(todayKey()).getFullYear(),
    },
  });

  let daysTouched = 0;
  let tasksCreated = 0;

  for (const dayPlan of days) {
    const week = await getOrCreateWeek(userId, dayPlan.date, user.weekStartsOn);
    const day = await getOrCreateDay(userId, dayPlan.date, user.weekStartsOn);
    if (dayPlan.challenge || dayPlan.objective) {
      await db.day.update({
        where: { id: day.id },
        data: {
          challenge: dayPlan.challenge ?? day.challenge,
          objective: dayPlan.objective ?? day.objective,
        },
      });
    }
    daysTouched++;

    const priorityWantedCount = dayPlan.tasks.filter((t) => t.isPriority).length;
    const ranks = await nextOpenDailyPriorityRanks(userId, day.id, priorityWantedCount);
    let rankCursor = 0;

    const existingSiblingCount = await db.task.count({ where: { userId, weekId: week.id, dayId: day.id } });
    for (let i = 0; i < dayPlan.tasks.length; i++) {
      const t = dayPlan.tasks[i];
      const rank = t.isPriority ? ranks[rankCursor++] : null;
      await db.task.create({
        data: {
          userId,
          weekId: week.id,
          dayId: day.id,
          goalId: goal.id,
          title: t.title,
          category: t.category ?? null,
          estimatedMinutes: t.estimatedMinutes ?? null,
          notes: t.notes ?? null,
          dailyPriorityRank: rank,
          sortOrder: existingSiblingCount + i,
        },
      });
      tasksCreated++;
    }
  }

  let habitsCreated = 0;
  for (const h of habits ?? []) {
    const existing = await db.habit.findFirst({ where: { userId, name: h.name } });
    if (!existing) {
      await db.habit.create({ data: { userId, name: h.name, frequency: h.frequency, target: h.target } });
      habitsCreated++;
    }
  }

  revalidatePath("/", "layout");
  return { daysTouched, tasksCreated, habitsCreated };
}
