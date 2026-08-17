import { TaskLite, PRIORITY_QUADRANT_LABELS } from "@/lib/types";
import { TaskPriority } from "@/generated/prisma/enums";

const QUADRANTS: TaskPriority[] = [
  "URGENT_IMPORTANT",
  "NOT_URGENT_IMPORTANT",
  "URGENT_NOT_IMPORTANT",
  "NOT_URGENT_NOT_IMPORTANT",
];

export function UrgentImportantMatrix({ tasks }: { tasks: TaskLite[] }) {
  return (
    <details className="rounded-xl border border-hairline bg-surface open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink">
        Urgent / important matrix
      </summary>
      <div className="grid grid-cols-2 gap-2 px-4">
        {QUADRANTS.map((quadrant) => {
          const items = tasks.filter((t) => t.priority === quadrant);
          return (
            <div key={quadrant} className="rounded-lg border border-hairline bg-surface-sunken/50 p-2.5 min-h-[5rem]">
              <p className="text-[11px] font-semibold text-ink-soft mb-1.5">{PRIORITY_QUADRANT_LABELS[quadrant].short}</p>
              <ul className="flex flex-col gap-1">
                {items.map((t) => (
                  <li key={t.id} className="text-xs text-ink truncate">• {t.title}</li>
                ))}
                {items.length === 0 && <li className="text-xs text-ink-faint">—</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </details>
  );
}
