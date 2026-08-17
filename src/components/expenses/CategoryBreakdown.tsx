import { ProgressBar } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryTotal } from "@/lib/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export function CategoryBreakdown({ totals, currency }: { totals: CategoryTotal[]; currency: string }) {
  if (totals.length === 0) {
    return <EmptyState prompt="No spending to break down yet." />;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {totals.map((t) => (
        <li key={t.category}>
          <div className="flex items-center justify-between mb-1 text-sm">
            <span className="text-ink">{EXPENSE_CATEGORY_LABELS[t.category]}</span>
            <span className="text-ink-soft">{formatCurrency(t.total, currency)} · {t.pct}%</span>
          </div>
          <ProgressBar value={t.pct} />
        </li>
      ))}
    </ul>
  );
}
