"use client";

import { clsx } from "clsx";
import { Checkbox } from "@/components/ui/Checkbox";
import { toggleTaskComplete } from "@/lib/actions/tasks";
import { useSyncedState } from "@/lib/hooks/useSyncedState";

export function QuickTaskList({ initialTasks }: { initialTasks: { id: string; title: string; completed: boolean }[] }) {
  const [tasks, setTasks] = useSyncedState(initialTasks);

  function handleToggle(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    void toggleTaskComplete(id);
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-2.5">
          <Checkbox checked={task.completed} onToggle={() => handleToggle(task.id)} label={task.title} />
          <span className={clsx("text-sm", task.completed ? "text-ink-faint line-through" : "text-ink")}>{task.title}</span>
        </li>
      ))}
    </ul>
  );
}
