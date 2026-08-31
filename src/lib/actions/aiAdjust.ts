"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { getOrCreateDay } from "@/lib/planner/days";
import { todayKey } from "@/lib/date/week";
import { applyPlannedDays } from "@/lib/ai/applyPlan";
import { AdjustmentPlanSchema, type AdjustmentPlan, type ResolvedUpdate, type ResolvedDelete } from "@/lib/ai/adjust";

const MAX_INSTRUCTION_CHARS = 2000;

export type AdjustableGoal = { id: string; title: string; taskCount: number };

export async function fetchAdjustableGoals(): Promise<AdjustableGoal[]> {
  const { userId } = await verifySession();
  const goals = await db.goal.findMany({
    where: { userId, level: "YEAR" },
    select: { id: true, title: true, _count: { select: { tasks: true, children: true } } },
    orderBy: { createdAt: "desc" },
  });
  const withDescendantCounts = await Promise.all(
    goals.map(async (g) => {
      const ids = await collectGoalIds(userId, g.id);
      const taskCount = await db.task.count({ where: { userId, goalId: { in: ids } } });
      return { id: g.id, title: g.title, taskCount };
    })
  );
  return withDescendantCounts.filter((g) => g.taskCount > 0);
}

// A goal picked for adjustment might be a flat AI-import goal (tasks linked directly to
// it) or a hand-built hierarchy (year -> month -> week, tasks linked to the leaf week
// goals) -- so "this goal's tasks" means the goal plus every descendant, not just itself.
async function collectGoalIds(userId: string, rootId: string): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await db.goal.findMany({ where: { userId, parentId: { in: frontier } }, select: { id: true } });
    if (children.length === 0) break;
    frontier = children.map((c) => c.id);
    ids.push(...frontier);
  }
  return ids;
}

export type ParseAdjustmentResult =
  | { error: string }
  | {
      summary: string;
      updates: ResolvedUpdate[];
      deletes: ResolvedDelete[];
      creates: AdjustmentPlan["creates"];
    };

export async function parseAdjustment(goalId: string, instruction: string): Promise<ParseAdjustmentResult> {
  const { userId } = await verifySession();
  const text = instruction.trim();
  if (!text) return { error: "Describe the change you want first." };
  if (text.length > MAX_INSTRUCTION_CHARS) {
    return { error: `That's ${text.length} characters — keep the instruction under ${MAX_INSTRUCTION_CHARS}.` };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "AI adjust isn't configured yet — add ANTHROPIC_API_KEY to the server's .env file and restart the dev server." };
  }

  const goal = await db.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return { error: "That plan wasn't found." };

  const goalIds = await collectGoalIds(userId, goalId);
  const tasks = await db.task.findMany({
    where: { userId, goalId: { in: goalIds } },
    select: {
      id: true,
      title: true,
      notes: true,
      category: true,
      estimatedMinutes: true,
      dailyPriorityRank: true,
      day: { select: { date: true } },
    },
    orderBy: [{ day: { date: "asc" } }],
  });
  if (tasks.length === 0) return { error: "That plan has no tasks to adjust." };

  const contextLines = tasks.map((t) =>
    JSON.stringify({
      taskId: t.id,
      date: t.day?.date ?? null,
      title: t.title,
      notes: t.notes ?? undefined,
      category: t.category ?? undefined,
      estimatedMinutes: t.estimatedMinutes ?? undefined,
      isPriority: t.dailyPriorityRank !== null,
    })
  );

  const client = new Anthropic();
  let parsedOutput: AdjustmentPlan | null;
  try {
    const stream = client.messages.stream({
      model: "claude-opus-5",
      max_tokens: 64000,
      system:
        `You adjust an existing structured plan based on a user's plain-language instruction. Today's date is ${todayKey()}. ` +
        `The plan "${goal.title}" currently has these tasks, one JSON object per line:\n${contextLines.join("\n")}\n\n` +
        "Propose the minimal set of changes that satisfies the instruction. " +
        "For any existing task that should change (move to a different date, get new/edited text, change priority, etc.), put it in `updates` using its EXACT existing taskId from the list above -- never invent an id, never put an id that isn't in that list. Only set the fields on an update that actually change; leave the rest omitted. " +
        "For any existing task that should be removed entirely, put its exact taskId in `deletes`. " +
        "For genuinely new days/tasks the instruction asks for that aren't in the list above, put them in `creates`, using the same shape as a fresh plan import. " +
        "Do not touch tasks that the instruction doesn't concern -- an instruction like 'push the plan back a week' means every task's date shifts by 7 days, not that content changes. " +
        "Mark at most 3 tasks per day as isPriority: true, matching the app's Top 3 daily priority slots. " +
        "Write a one-sentence `summary` of what this adjustment does overall.",
      messages: [{ role: "user", content: text }],
      output_config: { format: zodOutputFormat(AdjustmentPlanSchema) },
    });
    const response = await stream.finalMessage();
    parsedOutput = response.parsed_output;
  } catch (e) {
    console.error("[aiAdjust] parseAdjustment failed:", e);
    if (e instanceof Anthropic.AuthenticationError) return { error: "The server's Anthropic API key is invalid." };
    if (e instanceof Anthropic.RateLimitError) return { error: "Rate limited by the AI provider — try again shortly." };
    if (e instanceof Anthropic.APIError) return { error: `AI request failed: ${e.message}` };
    const message = e instanceof Error ? e.message : String(e);
    return { error: `Something went wrong figuring out that adjustment: ${message}` };
  }

  if (!parsedOutput) {
    return { error: "The AI couldn't work out a reliable adjustment for that instruction. Try rephrasing it more specifically." };
  }

  // Defense in depth: never trust the model's ids blindly -- only accept ones that are
  // genuinely in the set of tasks we just showed it, scoped to this user and this goal.
  const validTaskIds = new Set(tasks.map((t) => t.id));
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const updates: ResolvedUpdate[] = parsedOutput.updates
    .filter((u) => validTaskIds.has(u.taskId))
    .map((u) => {
      const before = byId.get(u.taskId)!;
      return {
        ...u,
        before: {
          title: before.title,
          date: before.day?.date ?? null,
          notes: before.notes,
          category: before.category,
          estimatedMinutes: before.estimatedMinutes,
          isPriority: before.dailyPriorityRank !== null,
        },
      };
    });

  const deletes: ResolvedDelete[] = parsedOutput.deletes
    .filter((id) => validTaskIds.has(id))
    .map((id) => {
      const t = byId.get(id)!;
      return { taskId: id, title: t.title, date: t.day?.date ?? null };
    });

  return { summary: parsedOutput.summary, updates, deletes, creates: parsedOutput.creates };
}

export async function commitAdjustment(
  goalId: string,
  updates: ResolvedUpdate[],
  deletes: string[],
  creates: AdjustmentPlan["creates"]
): Promise<{ error?: string; updated?: number; deleted?: number; created?: number }> {
  const { userId } = await verifySession();
  const goal = await db.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return { error: "That plan wasn't found." };
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const goalIds = await collectGoalIds(userId, goalId);
  const ownedTasks = await db.task.findMany({ where: { userId, goalId: { in: goalIds } }, select: { id: true } });
  const ownedIds = new Set(ownedTasks.map((t) => t.id));

  let deleted = 0;
  for (const taskId of deletes) {
    if (!ownedIds.has(taskId)) continue;
    await db.task.delete({ where: { id: taskId } });
    deleted++;
  }

  let updated = 0;
  for (const u of updates) {
    if (!ownedIds.has(u.taskId)) continue;
    const task = await db.task.findUnique({ where: { id: u.taskId } });
    if (!task) continue;

    let dayId = task.dayId;
    let weekId = task.weekId;
    let dailyPriorityRank = task.dailyPriorityRank;
    if (u.newDate) {
      const targetDay = await getOrCreateDay(userId, u.newDate, user.weekStartsOn);
      if (targetDay.id !== task.dayId) {
        dayId = targetDay.id;
        weekId = targetDay.weekId;
        // A rank from the old day isn't meaningful on the new one -- same reset
        // rescheduleTaskToDate applies for manual drag-and-drop moves.
        dailyPriorityRank = null;
      }
    }

    if (u.isPriority === false) {
      dailyPriorityRank = null;
    } else if (u.isPriority === true && dailyPriorityRank === null && dayId) {
      const existing = await db.task.findMany({
        where: { userId, dayId, dailyPriorityRank: { not: null }, id: { not: task.id } },
        select: { dailyPriorityRank: true },
      });
      const used = new Set(existing.map((t) => t.dailyPriorityRank));
      let rank = 1;
      while (used.has(rank) && rank <= 3) rank++;
      dailyPriorityRank = rank <= 3 ? rank : null;
    }

    await db.task.update({
      where: { id: u.taskId },
      data: {
        title: u.title ?? task.title,
        notes: u.notes ?? task.notes,
        category: u.category ?? task.category,
        estimatedMinutes: u.estimatedMinutes ?? task.estimatedMinutes,
        dayId,
        weekId,
        dailyPriorityRank,
      },
    });
    updated++;
  }

  const { tasksCreated } = await applyPlannedDays(userId, user.weekStartsOn, goal.id, creates);

  revalidatePath("/", "layout");
  return { updated, deleted, created: tasksCreated };
}
