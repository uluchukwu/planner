"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Label, Textarea } from "@/components/ui/Field";
import { saveWeeklyReview } from "@/lib/actions/weeklyReview";

const FIELDS: { key: keyof Initial; label: string; placeholder: string }[] = [
  { key: "wentWell", label: "What went well?", placeholder: "…" },
  { key: "didntGoWell", label: "What didn't go well?", placeholder: "…" },
  { key: "learned", label: "What did I learn?", placeholder: "…" },
  { key: "changeNextWeek", label: "What should I change next week?", placeholder: "…" },
  { key: "proudOf", label: "What am I proud of?", placeholder: "…" },
  { key: "carryForward", label: "What should I carry forward?", placeholder: "…" },
];

type Initial = {
  wentWell: string;
  didntGoWell: string;
  learned: string;
  changeNextWeek: string;
  proudOf: string;
  carryForward: string;
};

export function WeeklyReviewForm({ weekId, initial }: { weekId: string; initial: Initial }) {
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    const next = Object.fromEntries(FIELDS.map((f) => [f.key, String(formData.get(f.key) ?? "")])) as Initial;
    setValues(next);
    startTransition(async () => {
      await saveWeeklyReview(weekId, next);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <Label htmlFor={f.key}>{f.label}</Label>
          <Textarea id={f.key} name={f.key} rows={2} defaultValue={values[f.key]} placeholder={f.placeholder} />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Save reflection"}</Button>
        {saved && !pending && <span className="text-xs text-accent-strong">Saved</span>}
      </div>
    </form>
  );
}
