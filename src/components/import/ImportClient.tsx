"use client";

import { useState } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Field";
import { parsePlanWithAI, commitParsedPlan } from "@/lib/actions/aiImport";
import type { ParsedPlan } from "@/lib/ai/plan";
import { formatDateShort } from "@/lib/date/week";

type Step = "input" | "preview" | "done";

export function ImportClient() {
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [plan, setPlan] = useState<ParsedPlan | null>(null);
  const [conflictDates, setConflictDates] = useState<string[]>([]);
  const [excludedHabits, setExcludedHabits] = useState<Set<string>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ daysTouched?: number; tasksCreated?: number; habitsCreated?: number } | null>(null);

  async function handleParse() {
    setError(null);
    setParsing(true);
    try {
      const res = await parsePlanWithAI(rawText);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setPlan(res.plan);
      setConflictDates(res.daysWithExistingTasks);
      setStep("preview");
    } finally {
      setParsing(false);
    }
  }

  async function handleCommit() {
    if (!plan) return;
    setError(null);
    setCommitting(true);
    try {
      const habits = plan.habits?.filter((h) => !excludedHabits.has(h.name));
      const res = await commitParsedPlan({ ...plan, habits });
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult(res);
      setStep("done");
    } finally {
      setCommitting(false);
    }
  }

  function toggleHabit(name: string) {
    setExcludedHabits((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleStartOver() {
    setStep("input");
    setPlan(null);
    setConflictDates([]);
    setExcludedHabits(new Set());
    setError(null);
    setResult(null);
  }

  if (step === "done" && result) {
    const firstDate = plan?.days[0]?.date;
    return (
      <div className="rounded-xl border border-hairline bg-surface p-5">
        <p className="text-sm font-semibold text-ink mb-1">Added to your planner</p>
        <p className="text-sm text-ink-soft mb-4">
          {result.daysTouched} day{result.daysTouched === 1 ? "" : "s"}, {result.tasksCreated} task{result.tasksCreated === 1 ? "" : "s"}
          {result.habitsCreated ? `, ${result.habitsCreated} new habit${result.habitsCreated === 1 ? "" : "s"}` : ""}.
        </p>
        <div className="flex gap-2">
          {firstDate && (
            <Link href={`/day/${firstDate}`}>
              <Button variant="primary" size="sm">Go to {formatDateShort(firstDate)}</Button>
            </Link>
          )}
          <Button variant="secondary" size="sm" onClick={handleStartOver}>Import another plan</Button>
        </div>
      </div>
    );
  }

  if (step === "preview" && plan) {
    const dates = plan.days.map((d) => d.date).sort();
    const totalTasks = plan.days.reduce((sum, d) => sum + d.tasks.length, 0);
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <p className="text-sm font-semibold text-ink mb-1">{plan.planTitle}</p>
          <p className="text-xs text-ink-soft mb-3">
            {formatDateShort(dates[0])} – {formatDateShort(dates[dates.length - 1])} · {plan.days.length} day{plan.days.length === 1 ? "" : "s"} · {totalTasks} task{totalTasks === 1 ? "" : "s"}
            {plan.habits?.length ? ` · ${plan.habits.length} habit${plan.habits.length === 1 ? "" : "s"}` : ""}
          </p>
          {conflictDates.length > 0 && (
            <p className="text-xs text-priority bg-priority-soft rounded-lg px-3 py-2 mb-3">
              {conflictDates.length} of these days already have tasks in your planner. New tasks will be added alongside them, not replacing anything — but if any of those days already have all 3 Top-3 slots filled, this plan&apos;s priority picks for that day will be added as regular tasks instead.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-5 max-h-[28rem] overflow-y-auto flex flex-col gap-4">
          {plan.days.map((day) => (
            <div key={day.date}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-ink">{formatDateShort(day.date)}</p>
                {conflictDates.includes(day.date) && (
                  <span className="text-[10px] text-priority bg-priority-soft rounded-full px-1.5 py-0.5">already has tasks</span>
                )}
              </div>
              {day.challenge && <p className="text-xs text-ink-soft italic mb-1">&quot;{day.challenge}&quot;</p>}
              <ul className="flex flex-col gap-0.5">
                {day.tasks.map((t, i) => (
                  <li key={i} className="text-xs text-ink flex items-center gap-1.5">
                    {t.isPriority && <span className="text-priority">★</span>}
                    <span>{t.title}</span>
                    {t.estimatedMinutes && <span className="text-ink-faint">· {t.estimatedMinutes}min</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {plan.habits && plan.habits.length > 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <p className="text-xs font-semibold text-ink mb-2">
              Habits it wants to create <span className="text-ink-faint font-normal">— untick any you don&apos;t want</span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {plan.habits.map((h) => (
                <li key={h.name} className="text-xs text-ink flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!excludedHabits.has(h.name)}
                    onChange={() => toggleHabit(h.name)}
                    className="h-3.5 w-3.5"
                  />
                  <span className={clsx(excludedHabits.has(h.name) && "line-through text-ink-faint")}>
                    {h.name} — {h.frequency === "X_TIMES_PER_WEEK" ? `${h.target}×/week` : h.frequency.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button variant="primary" onClick={handleCommit} disabled={committing}>
            {committing ? "Adding…" : "Add to my planner"}
          </Button>
          <Button variant="ghost" onClick={handleStartOver} disabled={committing}>Start over</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="plan-text">Your plan</Label>
      <Textarea
        id="plan-text"
        rows={14}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Paste your plan here — dates, daily activities, goals, anything you already have written out."
        className={clsx(parsing && "opacity-60")}
        disabled={parsing}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <Button variant="primary" onClick={handleParse} disabled={parsing || !rawText.trim()}>
          {parsing ? "Reading your plan…" : "Parse with AI"}
        </Button>
      </div>
    </div>
  );
}
