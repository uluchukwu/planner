"use client";

import { useState, useTransition } from "react";

export function QuickAddTask({ onAdd, placeholder = "Add a task…" }: { onAdd: (title: string) => void; placeholder?: string }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = value.trim();
    if (!title) return;
    setValue("");
    startTransition(() => onAdd(title));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-1.5 px-0.5"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={pending}
        className="w-full rounded-lg border border-dashed border-hairline bg-transparent px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-offset-1 focus:outline-accent focus:border-solid"
      />
    </form>
  );
}
