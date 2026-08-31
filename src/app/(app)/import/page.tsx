import { ImportModeSwitcher } from "@/components/import/ImportModeSwitcher";

export default async function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-xl font-semibold text-ink tracking-tight mb-1">AI import</h1>
      <p className="text-sm text-ink-soft mb-6">
        Turn a plan into real days, tasks, and goals in your planner, or adjust one already here — describe the change and it&apos;ll figure out what to do. Nothing is written until you review and confirm it below.
      </p>
      <ImportModeSwitcher />
    </div>
  );
}
