import { ImportClient } from "@/components/import/ImportClient";

export default async function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-xl font-semibold text-ink tracking-tight mb-1">AI import</h1>
      <p className="text-sm text-ink-soft mb-6">
        Paste a plan you already have — a study schedule, a project timeline, anything with dates and daily activities — and it&apos;ll be turned into real days, tasks, and goals in your planner. Nothing is written until you review and confirm it below.
      </p>
      <ImportClient />
    </div>
  );
}
