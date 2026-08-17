"use client";

import { useState } from "react";
import { updateDayFields } from "@/lib/actions/days";

export function ChallengeField({ dayId, initialValue }: { dayId: string; initialValue: string | null }) {
  const [value, setValue] = useState(initialValue ?? "");

  return (
    <div className="rounded-xl border border-priority-soft bg-priority-soft/40 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-priority mb-1">Today&apos;s challenge</p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void updateDayFields(dayId, { challenge: value.trim() || null })}
        placeholder="Stay focused and avoid unnecessary distractions."
        className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}

export function ObjectiveField({ dayId, initialValue }: { dayId: string; initialValue: string | null }) {
  const [value, setValue] = useState(initialValue ?? "");

  return (
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-1">Objective</p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void updateDayFields(dayId, { objective: value.trim() || null })}
        placeholder="What is this day for?"
        className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}
