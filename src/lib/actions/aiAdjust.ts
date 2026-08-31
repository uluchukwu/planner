"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { getOrCreateDay } from "@/lib/planner/days";
import { todayKey, addDays } from "@/lib/date/week";
import { applyPlannedDays } from "@/lib/ai/applyPlan";
import { AdjustmentPlanSchema, MAX_INSTRUCTION_CHARS, type AdjustmentPlan, type ResolvedUpdate, type ResolvedDelete } from "@/lib/ai/adjust";

export type AdjustableGoal = { id: string; title: string; level: "YEAR" | "MONTH" | "WEEK"; taskCount: number };

// Every goal level is selectable, not just YEAR -- a big hand-built hierarchy (year ->
// month -> week) has far more tasks under its year goal than under any one of its week
// goals, and a plain-language instruction that needs to reconsider most of a plan's
// content (not just shift dates) is slow in direct proportion to how many tasks it has
// to look at. Letting the user target "just this week" instead of "the whole plan" is a
// real, tested way to keep an otherwise-slow instruction fast: confirmed directly that a
// content-rewriting instruction over ~100 tasks took nearly 3 minutes, which risks the
// same platform-level proxy-timeout limitation already documented for large AI imports.
export async function fetchAdjustableGoals(): Promise<AdjustableGoal[]> {
  const { userId } = await verifySession();
  const goals = await db.goal.findMany({
    where: { userId },
    select: { id: true, title: true, level: true },
    orderBy: [{ level: "asc" }, { createdAt: "desc" }],
  });
  const withDescendantCounts = await Promise.all(
    goals.map(async (g) => {
      const ids = await collectGoalIds(userId, g.id);
      const taskCount = await db.task.count({ where: { userId, goalId: { in: ids } } });
      return { id: g.id, title: g.title, level: g.level, taskCount };
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
        "If the instruction is a blanket shift of the whole plan's dates (e.g. 'push it back a week', 'move everything 3 days earlier'), set `shiftAllByDays` to the number of days (positive = later, negative = earlier) INSTEAD OF listing every task individually in `updates` -- do not enumerate hundreds of per-task date changes for a uniform shift, it's slow and unnecessary. " +
        "For any existing task that needs something OTHER than (or in addition to) that uniform shift -- different content, a change of priority, a one-off date that doesn't follow the blanket shift -- put it in `updates` using its EXACT existing taskId from the list above -- never invent an id, never put an id that isn't in that list. Only set the fields on an update that actually change; leave the rest omitted. " +
        "For any existing task that should be removed entirely, put its exact taskId in `deletes`. " +
        "For genuinely new days/tasks the instruction asks for that aren't in the list above, put them in `creates`, using the same shape as a fresh plan import. " +
        "Do not touch tasks that the instruction doesn't concern. " +
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

  // Expand a blanket shift into a per-task date change server-side, for every task the
  // model didn't already give its own update/delete -- this is what keeps a whole-plan
  // shift on a large plan from ever needing to be enumerated by the model at all.
  const rawUpdates = [...parsedOutput.updates];
  if (parsedOutput.shiftAllByDays) {
    const shift = parsedOutput.shiftAllByDays;
    const alreadyHandled = new Set([...parsedOutput.updates.map((u) => u.taskId), ...parsedOutput.deletes]);
    for (const t of tasks) {
      if (alreadyHandled.has(t.id) || !t.day?.date) continue;
      rawUpdates.push({ taskId: t.id, newDate: addDays(t.day.date, shift) });
    }
  }

  const updates: ResolvedUpdate[] = rawUpdates
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
  const ownedTasks = await db.task.findMany({ where: { userId, goalId: { in: goalIds } } });
  const ownedById = new Map(ownedTasks.map((t) => [t.id, t]));

  const deleteSet = new Set(deletes.filter((id) => ownedById.has(id)));
  const validUpdates = updates.filter((u) => ownedById.has(u.taskId) && !deleteSet.has(u.taskId));

  // Resolve every distinct target date once, up front -- a blanket shift on a large plan
  // (e.g. 252 tasks) touches far fewer distinct dates than tasks, and get-or-create isn't
  // something the write transaction below should repeat once per task.
  const distinctDates = [...new Set(validUpdates.map((u) => u.newDate).filter((d): d is string => !!d))];
  const dayByDate = new Map<string, { id: string; weekId: string | null }>();
  for (const date of distinctDates) {
    const day = await getOrCreateDay(userId, date, user.weekStartsOn);
    dayByDate.set(date, { id: day.id, weekId: day.weekId });
  }

  // A large adjustment (hundreds of tasks) can take longer than Prisma's default 5s
  // interactive-transaction timeout -- give it real headroom rather than failing partway
  // through a batch that should be all-or-nothing.
  const { deleted, updated } = await db.$transaction(
    async (tx) => {
      let deletedCount = 0;
      if (deleteSet.size > 0) {
        const res = await tx.task.deleteMany({ where: { id: { in: [...deleteSet] } } });
        deletedCount = res.count;
      }

      let updatedCount = 0;
      for (const u of validUpdates) {
        const task = ownedById.get(u.taskId)!;

        let dayId = task.dayId;
        let weekId = task.weekId;
        let dailyPriorityRank = task.dailyPriorityRank;
        if (u.newDate) {
          const target = dayByDate.get(u.newDate)!;
          if (target.id !== task.dayId) {
            dayId = target.id;
            weekId = target.weekId;
            // A rank from the old day isn't meaningful on the new one -- same reset
            // rescheduleTaskToDate applies for manual drag-and-drop moves.
            dailyPriorityRank = null;
          }
        }

        if (u.isPriority === false) {
          dailyPriorityRank = null;
        } else if (u.isPriority === true && dailyPriorityRank === null && dayId) {
          const existing = await tx.task.findMany({
            where: { userId, dayId, dailyPriorityRank: { not: null }, id: { not: task.id } },
            select: { dailyPriorityRank: true },
          });
          const used = new Set(existing.map((t) => t.dailyPriorityRank));
          let rank = 1;
          while (used.has(rank) && rank <= 3) rank++;
          dailyPriorityRank = rank <= 3 ? rank : null;
        }

        await tx.task.update({
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
        updatedCount++;
      }
      return { deleted: deletedCount, updated: updatedCount };
    },
    { timeout: 60_000, maxWait: 10_000 }
  );

  const { tasksCreated } = await applyPlannedDays(userId, user.weekStartsOn, goal.id, creates);

  revalidatePath("/", "layout");
  return { updated, deleted, created: tasksCreated };
}
