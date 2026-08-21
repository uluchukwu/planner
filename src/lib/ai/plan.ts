import { z } from "zod";

// The structured shape an AI import parses a freeform plan into. Deliberately smaller
// than what a hand-written seed script can express (one flat goal per import, not a
// goal hierarchy) — an LLM parsing an arbitrary plan is far more likely to get a flat
// structure right than to correctly infer week groupings for content it didn't design.
// A user can always split an imported goal into sub-goals afterward through the
// existing Goals UI.
export const PlannedTaskSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  category: z.string().max(60).optional(),
  estimatedMinutes: z.number().int().positive().max(1440).optional(),
  isPriority: z
    .boolean()
    .optional()
    .describe("True only for this day's single most important 1-3 tasks — maps to the app's Top 3 daily priority slots, which are capped at 3."),
});

export const PlannedDaySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date, YYYY-MM-DD")
    .describe("The exact calendar date this day's content belongs to, resolved from the plan's own dates or day-offsets."),
  challenge: z.string().max(300).optional().describe("A one-sentence framing/challenge for the day, if the plan implies one."),
  objective: z.string().max(300).optional().describe("A one-sentence objective for the day, if the plan implies one."),
  tasks: z.array(PlannedTaskSchema).min(1).max(8),
});

export const PlannedHabitSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.enum(["DAILY", "WEEKLY", "X_TIMES_PER_WEEK"]),
  target: z.number().int().positive().max(7),
});

export const ParsedPlanSchema = z.object({
  planTitle: z.string().min(1).max(120).describe("A short name for the whole plan, used as its overarching goal's title."),
  days: z.array(PlannedDaySchema).min(1).max(180),
  habits: z.array(PlannedHabitSchema).max(20).optional(),
});

export type ParsedPlan = z.infer<typeof ParsedPlanSchema>;
export type PlannedDay = z.infer<typeof PlannedDaySchema>;
export type PlannedTask = z.infer<typeof PlannedTaskSchema>;
