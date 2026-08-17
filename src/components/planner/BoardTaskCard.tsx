"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskContent } from "@/components/planner/TaskContent";
import { TaskLite } from "@/lib/types";

export function BoardTaskCard({
  task,
  onToggleComplete,
  onDelete,
}: {
  task: TaskLite;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
    >
      <TaskContent
        task={task}
        onToggleComplete={onToggleComplete}
        onDelete={onDelete}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag "${task.title}" to reschedule`}
            className="touch-none cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink-soft pt-1 shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <circle cx="7" cy="5" r="1.2" fill="currentColor" />
              <circle cx="13" cy="5" r="1.2" fill="currentColor" />
              <circle cx="7" cy="10" r="1.2" fill="currentColor" />
              <circle cx="13" cy="10" r="1.2" fill="currentColor" />
              <circle cx="7" cy="15" r="1.2" fill="currentColor" />
              <circle cx="13" cy="15" r="1.2" fill="currentColor" />
            </svg>
          </button>
        }
      />
    </div>
  );
}
