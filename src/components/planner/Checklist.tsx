"use client";

import { clsx } from "clsx";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChecklistItemLite } from "@/lib/types";
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem } from "@/lib/actions/checklists";
import { useSyncedState } from "@/lib/hooks/useSyncedState";
import { QuickAddTask } from "@/components/planner/QuickAddTask";

export function Checklist({ checklistId, title, initialItems }: { checklistId: string; title: string; initialItems: ChecklistItemLite[] }) {
  const [items, setItems] = useSyncedState(initialItems);

  function handleToggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)));
    void toggleChecklistItem(id);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    void deleteChecklistItem(id);
  }

  function handleAdd(label: string) {
    void addChecklistItem(checklistId, label);
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink mb-3">{title}</h2>
      <ul className="flex flex-col gap-1.5 mb-2">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2.5">
            <Checkbox checked={item.completed} onToggle={() => handleToggle(item.id)} label={item.label} size="sm" />
            <span className={clsx("text-sm flex-1", item.completed ? "text-ink-faint line-through" : "text-ink")}>
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              aria-label={`Delete "${item.label}"`}
              className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger p-0.5"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-sm text-ink-soft mb-2">Review previous week, plan next week…</p>}
      <QuickAddTask onAdd={handleAdd} placeholder="Add checklist item…" />
    </section>
  );
}
