"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  formatMinutesLabel,
  timeInputToMinutes,
} from "@/lib/planner/timeblocks";
import { createTimeBlock, deleteTimeBlock } from "@/lib/actions/timeblocks";
import { TaskLite } from "@/lib/types";
import { useSyncedState } from "@/lib/hooks/useSyncedState";

export type TimeBlockLite = { id: string; title: string; startMinutes: number; endMinutes: number; taskId: string | null };

const ROW_HEIGHT = 44;
const GUTTER = 56;

export function TimeBlockTimeline({ dayId, initialBlocks, tasks }: { dayId: string; initialBlocks: TimeBlockLite[]; tasks: TaskLite[] }) {
  const [blocks, setBlocks] = useSyncedState(initialBlocks);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hours = Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 }, (_, i) => TIMELINE_START_HOUR + i);
  const totalHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * ROW_HEIGHT;

  async function handleSubmit(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    const startMinutes = timeInputToMinutes(String(formData.get("start")));
    const endMinutes = timeInputToMinutes(String(formData.get("end")));
    const taskId = String(formData.get("taskId") ?? "") || null;
    if (!title) return;

    const result = await createTimeBlock({ dayId, title, startMinutes, endMinutes, taskId });
    if (result?.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setFormOpen(false);
    // No optimistic insert: useSyncedState picks up the server-issued row once
    // createTimeBlock's revalidation lands (see DayView's handleAdd for the same call).
  }

  function handleDelete(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    void deleteTimeBlock(id);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-ink">Timeline</h2>
        <Button variant="ghost" size="sm" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Cancel" : "+ Add block"}
        </Button>
      </div>

      {error && <p className="text-xs text-danger bg-danger-soft rounded-lg px-2.5 py-1.5 mb-2">{error}</p>}

      {formOpen && (
        <form
          action={handleSubmit}
          className="mb-3 flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-3 sm:flex-row sm:items-end sm:flex-wrap"
        >
          <div className="flex flex-col gap-1 flex-1 min-w-[10rem]">
            <Label htmlFor="tb-title">Title</Label>
            <Input id="tb-title" name="title" required placeholder="Study Applied Diagnostics" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tb-start">Start</Label>
            <Input id="tb-start" name="start" type="time" defaultValue="09:00" required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="tb-end">End</Label>
            <Input id="tb-end" name="end" type="time" defaultValue="10:00" required />
          </div>
          {tasks.length > 0 && (
            <div className="flex flex-col gap-1 min-w-[9rem]">
              <Label htmlFor="tb-task">Link to task</Label>
              <Select id="tb-task" name="taskId" defaultValue="">
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </Select>
            </div>
          )}
          <Button type="submit" variant="primary" size="sm">Add</Button>
        </form>
      )}

      <div className="flex rounded-xl border border-hairline bg-surface overflow-hidden">
        <div className="relative shrink-0" style={{ width: GUTTER, height: totalHeight }}>
          {hours.map((h) => (
            <div key={h} className="absolute left-0 right-2 text-right text-[11px] text-ink-faint" style={{ top: (h - TIMELINE_START_HOUR) * ROW_HEIGHT - 6 }}>
              {formatMinutesLabel(h * 60)}
            </div>
          ))}
        </div>
        <div className="relative flex-1 border-l border-hairline" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-hairline/70"
              style={{ top: (h - TIMELINE_START_HOUR) * ROW_HEIGHT }}
            />
          ))}
          {blocks.map((block) => {
            const clampedStart = Math.max(block.startMinutes, TIMELINE_START_HOUR * 60);
            const clampedEnd = Math.min(block.endMinutes, TIMELINE_END_HOUR * 60);
            if (clampedEnd <= clampedStart) return null;
            const top = ((clampedStart - TIMELINE_START_HOUR * 60) / 60) * ROW_HEIGHT;
            const height = Math.max(((clampedEnd - clampedStart) / 60) * ROW_HEIGHT, 22);
            return (
              <div
                key={block.id}
                className="group absolute left-2 right-2 rounded-md bg-accent-soft border border-accent/30 px-2 py-1 overflow-hidden"
                style={{ top, height }}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-medium text-accent-strong leading-tight truncate">{block.title}</p>
                  <button
                    type="button"
                    onClick={() => handleDelete(block.id)}
                    aria-label={`Delete time block "${block.title}"`}
                    className="opacity-0 group-hover:opacity-100 text-accent-strong/70 hover:text-danger shrink-0"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {height > 30 && (
                  <p className="text-[10px] text-accent-strong/70">
                    {formatMinutesLabel(block.startMinutes)} – {formatMinutesLabel(block.endMinutes)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
