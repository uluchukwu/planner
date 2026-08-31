"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, Select } from "@/components/ui/Field";
import { fetchAdjustableGoals, parseAdjustment, commitAdjustment, type AdjustableGoal } from "@/lib/actions/aiAdjust";
import { MAX_INSTRUCTION_CHARS, type ResolvedUpdate, type ResolvedDelete, type AdjustmentPlan } from "@/lib/ai/adjust";
import { formatDateShort } from "@/lib/date/week";

type Step = "input" | "preview" | "done";

export function AdjustClient() {
  const [goals, setGoals] = useState<AdjustableGoal[] | null>(null);
  const [goalId, setGoalId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [summary, setSummary] = useState("");
  const [updates, setUpdates] = useState<ResolvedUpdate[]>([]);
  const [deletes, setDeletes] = useState<ResolvedDelete[]>([]);
  const [creates, setCreates] = useState<AdjustmentPlan["creates"]>([]);
  const [excludedUpdates, setExcludedUpdates] = useState<Set<string>>(new Set());
  const [excludedDeletes, setExcludedDeletes] = useState<Set<string>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated?: number; deleted?: number; created?: number } | null>(null);

  useEffect(() => {
    fetchAdjustableGoals().then((gs) => {
      setGoals(gs);
      if (gs.length > 0) setGoalId(gs[0].id);
    });
  }, []);

  async function handleParse() {
    setError(null);
    setParsing(true);
    try {
      const res = await parseAdjustment(goalId, instruction);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSummary(res.summary);
      setUpdates(res.updates);
      setDeletes(res.deletes);
      setCreates(res.creates);
      setExcludedUpdates(new Set());
      setExcludedDeletes(new Set());
      if (res.updates.length === 0 && res.deletes.length === 0 && res.creates.length === 0) {
        setError("The AI didn't find any change to make for that instruction — try being more specific.");
        return;
      }
      setStep("preview");
    } finally {
      setParsing(false);
    }
  }

  async function handleCommit() {
    setError(null);
    setCommitting(true);
    try {
      const keptUpdates = updates.filter((u) => !excludedUpdates.has(u.taskId));
      const keptDeletes = deletes.filter((d) => !excludedDeletes.has(d.taskId)).map((d) => d.taskId);
      const res = await commitAdjustment(goalId, keptUpdates, keptDeletes, creates);
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

  function toggleUpdate(taskId: string) {
    setExcludedUpdates((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function toggleDelete(taskId: string) {
    setExcludedDeletes((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function handleStartOver() {
    setStep("input");
    setInstruction("");
    setSummary("");
    setUpdates([]);
    setDeletes([]);
    setCreates([]);
    setExcludedUpdates(new Set());
    setExcludedDeletes(new Set());
    setError(null);
    setResult(null);
  }

  if (goals !== null && goals.length === 0) {
    return <p className="text-sm text-ink-soft">You don&apos;t have any plans with tasks yet to adjust — import or build one first.</p>;
  }

  if (step === "done" && result) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-5">
        <p className="text-sm font-semibold text-ink mb-1">Plan adjusted</p>
        <p className="text-sm text-ink-soft mb-4">
          {result.updated ?? 0} task{result.updated === 1 ? "" : "s"} changed, {result.deleted ?? 0} removed, {result.created ?? 0} new task{result.created === 1 ? "" : "s"} added.
        </p>
        <Button variant="secondary" size="sm" onClick={handleStartOver}>Make another adjustment</Button>
      </div>
    );
  }

  if (step === "preview") {
    const totalCreateTasks = creates.reduce((sum, d) => sum + d.tasks.length, 0);
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <p className="text-sm text-ink">{summary}</p>
        </div>

        {updates.length > 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-5 max-h-96 overflow-y-auto">
            <p className="text-xs font-semibold text-ink mb-2">
              Changed tasks <span className="text-ink-faint font-normal">— untick any to leave unchanged</span>
            </p>
            <ul className="flex flex-col gap-2">
              {updates.map((u) => (
                <li key={u.taskId} className="text-xs text-ink flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!excludedUpdates.has(u.taskId)}
                    onChange={() => toggleUpdate(u.taskId)}
                    className="h-3.5 w-3.5 mt-0.5"
                  />
                  <span className={clsx(excludedUpdates.has(u.taskId) && "line-through text-ink-faint")}>
                    <span className="text-ink-faint">{u.before.date ? formatDateShort(u.before.date) : "Inbox"}</span>{" "}
                    {u.before.title}
                    {(u.newDate || u.title || u.isPriority !== undefined) && (
                      <span className="text-ink-faint">
                        {" → "}
                        {u.newDate && `${formatDateShort(u.newDate)} `}
                        {u.title && u.title !== u.before.title && `"${u.title}" `}
                        {u.isPriority === true && "★ priority "}
                        {u.isPriority === false && "un-priority "}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {deletes.length > 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-5 max-h-64 overflow-y-auto">
            <p className="text-xs font-semibold text-ink mb-2">
              Tasks to remove <span className="text-ink-faint font-normal">— untick any to keep</span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {deletes.map((d) => (
                <li key={d.taskId} className="text-xs text-ink flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!excludedDeletes.has(d.taskId)}
                    onChange={() => toggleDelete(d.taskId)}
                    className="h-3.5 w-3.5"
                  />
                  <span className={clsx(excludedDeletes.has(d.taskId) && "line-through text-ink-faint")}>
                    <span className="text-ink-faint">{d.date ? formatDateShort(d.date) : "Inbox"}</span> {d.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {creates.length > 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-5 max-h-64 overflow-y-auto">
            <p className="text-xs font-semibold text-ink mb-2">
              New tasks <span className="text-ink-faint font-normal">({totalCreateTasks})</span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {creates.flatMap((d) =>
                d.tasks.map((t, i) => (
                  <li key={`${d.date}-${i}`} className="text-xs text-ink flex items-center gap-1.5">
                    <span className="text-ink-faint">{formatDateShort(d.date)}</span>
                    {t.isPriority && <span className="text-priority">★</span>}
                    <span>{t.title}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button variant="primary" onClick={handleCommit} disabled={committing}>
            {committing ? "Applying…" : "Apply changes"}
          </Button>
          <Button variant="ghost" onClick={handleStartOver} disabled={committing}>Start over</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="adjust-goal">Which plan?</Label>
      <Select id="adjust-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} disabled={goals === null}>
        {goals === null && <option>Loading…</option>}
        {goals?.map((g) => (
          <option key={g.id} value={g.id}>
            [{g.level === "YEAR" ? "Whole plan" : g.level === "MONTH" ? "Month" : "Week"}] {g.title} ({g.taskCount} task{g.taskCount === 1 ? "" : "s"})
          </option>
        ))}
      </Select>
      <p className="text-xs text-ink-faint -mt-2">
        Picking a smaller scope (a month or week instead of the whole plan) is faster and more reliable for instructions that rework a lot of content, not just dates.
      </p>

      <Label htmlFor="adjust-instruction">What should change?</Label>
      <Textarea
        id="adjust-instruction"
        rows={8}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="e.g. Push the whole plan back by one week. Or: Move Tuesday's writing task to Thursday instead."
        className={clsx(parsing && "opacity-60")}
        disabled={parsing}
      />
      <p className={clsx("text-xs text-right -mt-2", instruction.length > MAX_INSTRUCTION_CHARS ? "text-danger" : "text-ink-faint")}>
        {instruction.length} / {MAX_INSTRUCTION_CHARS}
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <Button
          variant="primary"
          onClick={handleParse}
          disabled={parsing || !instruction.trim() || !goalId || instruction.length > MAX_INSTRUCTION_CHARS}
        >
          {parsing ? "Working it out…" : "Figure out the changes"}
        </Button>
      </div>
    </div>
  );
}
