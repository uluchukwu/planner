"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { BoardTaskCard } from "@/components/planner/BoardTaskCard";
import { TaskContent } from "@/components/planner/TaskContent";
import { QuickAddTask } from "@/components/planner/QuickAddTask";
import { TaskLite } from "@/lib/types";
import { createTask, moveTask, reorderColumn, toggleTaskComplete, deleteTask } from "@/lib/actions/tasks";
import { useSyncedState } from "@/lib/hooks/useSyncedState";

export type BoardColumn = { key: string; label: string; sublabel?: string; dayId: string | null; href?: string };

export function WeekBoard({ weekId, columns, initialTasks }: { weekId: string; columns: BoardColumn[]; initialTasks: Record<string, TaskLite[]> }) {
  const [state, setState] = useSyncedState(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskLite | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const dayIdByColumn = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c.dayId])), [columns]);

  function findColumn(taskId: string): string | undefined {
    return Object.keys(state).find((key) => state[key].some((t) => t.id === taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    const columnKey = findColumn(event.active.id as string);
    if (!columnKey) return;
    setActiveTask(state[columnKey].find((t) => t.id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const fromCol = findColumn(activeId);
    const toCol = columns.some((c) => c.key === overId) ? overId : findColumn(overId);
    if (!fromCol || !toCol || fromCol === toCol) return;

    setState((prev) => {
      const fromItems = prev[fromCol];
      const task = fromItems.find((t) => t.id === activeId);
      if (!task) return prev;
      const toItems = prev[toCol];
      const overIndex = toItems.findIndex((t) => t.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;

      return {
        ...prev,
        [fromCol]: fromItems.filter((t) => t.id !== activeId),
        [toCol]: [...toItems.slice(0, insertAt), task, ...toItems.slice(insertAt)],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const col = findColumn(activeId);
    if (!col) return;

    // setState updater callbacks must stay pure — React can invoke them more than
    // once (Strict Mode, concurrent rendering) — so the persistence side effect is
    // computed from the updater's result but fired afterwards, not from inside it.
    let orderedIds: string[] = [];
    setState((prev) => {
      const items = prev[col];
      const activeIndex = items.findIndex((t) => t.id === activeId);
      const overIndex = items.findIndex((t) => t.id === overId);
      const reordered = overIndex >= 0 && overIndex !== activeIndex ? arrayMove(items, activeIndex, overIndex) : items;
      const next = { ...prev, [col]: reordered };
      orderedIds = next[col].map((t) => t.id);
      return next;
    });

    const dayId = dayIdByColumn[col] ?? null;
    void moveTask(activeId, dayId).then(() => reorderColumn(weekId, dayId, orderedIds));
  }

  function addTask(columnKey: string, title: string) {
    // No optimistic insert: the new row needs a server-issued id, and useSyncedState
    // picks it up as soon as createTask's revalidation lands (see DayView's handleAdd).
    const dayId = dayIdByColumn[columnKey] ?? null;
    void createTask({ title, weekId, dayId });
  }

  function handleToggle(columnKey: string, taskId: string) {
    setState((prev) => ({
      ...prev,
      [columnKey]: prev[columnKey].map((t) =>
        t.id === taskId ? { ...t, status: t.status === "COMPLETED" ? "PENDING" : "COMPLETED" } : t
      ),
    }));
    void toggleTaskComplete(taskId);
  }

  function handleDelete(columnKey: string, taskId: string) {
    setState((prev) => ({ ...prev, [columnKey]: prev[columnKey].filter((t) => t.id !== taskId) }));
    void deleteTask(taskId);
  }

  return (
    <DndContext
      id="week-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {columns.map((col) => (
          <Column
            key={col.key}
            column={col}
            tasks={state[col.key] ?? []}
            onAdd={(title) => addTask(col.key, title)}
            onToggle={(taskId) => handleToggle(col.key, taskId)}
            onDelete={(taskId) => handleDelete(col.key, taskId)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-1 shadow-lg rounded-lg">
            <TaskContent task={activeTask} onToggleComplete={() => {}} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  column,
  tasks,
  onAdd,
  onToggle,
  onDelete,
}: {
  column: BoardColumn;
  tasks: TaskLite[];
  onAdd: (title: string) => void;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col gap-2 rounded-xl border p-2.5 transition-colors ${
        isOver ? "border-accent bg-accent-soft/40" : "border-hairline bg-surface-sunken/60"
      }`}
    >
      <div className="flex items-baseline justify-between px-0.5">
        {column.href ? (
          <Link href={column.href} prefetch={false} className="text-sm font-semibold text-ink hover:text-accent-strong">
            {column.label}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-ink">{column.label}</span>
        )}
        {column.sublabel && <span className="text-[11px] text-ink-faint">{column.sublabel}</span>}
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5 min-h-[2rem]">
          {tasks.map((task) => (
            <BoardTaskCard
              key={task.id}
              task={task}
              onToggleComplete={() => onToggle(task.id)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      </SortableContext>

      <QuickAddTask onAdd={onAdd} placeholder="Add task…" />
    </div>
  );
}
