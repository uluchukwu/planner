import { z } from "zod";
import { PlannedDaySchema } from "@/lib/ai/plan";

// Structured shape for the AI edit-by-instruction flow: given an existing goal's tasks
// plus a plain-language instruction, the AI proposes changes to make instead of writing
// them directly. Every update/delete references an existing task by its real id (echoed
// back from the context we gave it) — never invented — so the commit step can verify
// each id actually belongs to the user and the scoped goal before touching anything.
export const TaskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  category: z.string().max(60).optional(),
  estimatedMinutes: z.number().int().positive().max(1440).optional(),
  newDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date, YYYY-MM-DD")
    .optional()
    .describe("Set only if this task should move to a different day than it's currently on."),
  isPriority: z.boolean().optional().describe("Set only if this task's Top-3-daily-priority status should change."),
});

export const AdjustmentPlanSchema = z.object({
  summary: z.string().min(1).max(300).describe("One sentence describing what this adjustment does overall."),
  updates: z.array(TaskUpdateSchema).max(200),
  deletes: z.array(z.string().uuid()).max(200).describe("ids of existing tasks to remove entirely."),
  creates: z.array(PlannedDaySchema).max(60).describe("Brand-new days/tasks the instruction asks for that don't exist yet."),
});

export type AdjustmentPlan = z.infer<typeof AdjustmentPlanSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;

// What the preview UI actually renders for an update — the proposed AI diff resolved
// against the real existing row, so the UI can show a before -> after without re-fetching.
export type ResolvedUpdate = TaskUpdate & {
  before: { title: string; date: string | null; notes: string | null; category: string | null; estimatedMinutes: number | null; isPriority: boolean };
};

export type ResolvedDelete = { taskId: string; title: string; date: string | null };
