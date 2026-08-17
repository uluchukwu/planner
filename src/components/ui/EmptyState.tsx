import { ReactNode } from "react";

export function EmptyState({ prompt, action }: { prompt: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline px-6 py-10 text-center">
      <p className="text-sm text-ink-soft max-w-xs">{prompt}</p>
      {action}
    </div>
  );
}
