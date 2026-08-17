"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { createGoal } from "@/lib/actions/goals";
import { GoalCategory, GoalLevel } from "@/generated/prisma/enums";

const CATEGORIES: GoalCategory[] = [
  "CAREER",
  "EDUCATION",
  "HEALTH",
  "FINANCE",
  "PERSONAL",
  "RELATIONSHIPS",
  "BUSINESS",
  "PROJECTS",
  "OTHER",
];

export function NewGoalForm({
  level,
  yearKey,
  monthKey,
  parentOptions,
}: {
  level: GoalLevel;
  yearKey?: number;
  monthKey?: string;
  parentOptions?: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const description = String(formData.get("description") ?? "").trim() || null;
    const category = String(formData.get("category") ?? "OTHER") as GoalCategory;
    const targetDate = String(formData.get("targetDate") ?? "") || null;
    const parentId = String(formData.get("parentId") ?? "") || null;

    await createGoal({ level, title, description, category, targetDate, parentId, yearKey, monthKey });
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Add {level === "YEAR" ? "yearly" : "monthly"} goal
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-hairline bg-surface p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${level}-title`}>Title</Label>
        <Input id={`${level}-title`} name="title" required autoFocus placeholder="e.g. Complete MSc program" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${level}-description`}>Description</Label>
        <Textarea id={`${level}-description`} name="description" rows={2} placeholder="Optional detail" />
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
          <Label htmlFor={`${level}-category`}>Category</Label>
          <Select id={`${level}-category`} name="category" defaultValue="OTHER">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${level}-targetDate`}>Target date</Label>
          <Input id={`${level}-targetDate`} name="targetDate" type="date" />
        </div>
        {parentOptions && parentOptions.length > 0 && (
          <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
            <Label htmlFor={`${level}-parentId`}>Belongs to</Label>
            <Select id={`${level}-parentId`} name="parentId" defaultValue="">
              <option value="">None</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm">Add goal</Button>
      </div>
    </form>
  );
}
