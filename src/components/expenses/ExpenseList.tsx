"use client";

import { deleteExpense } from "@/lib/actions/expenses";
import { useSyncedState } from "@/lib/hooks/useSyncedState";
import { ExpenseLite, EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { formatMonthDay } from "@/lib/date/week";
import { EmptyState } from "@/components/ui/EmptyState";

export function ExpenseList({ initialExpenses, currency }: { initialExpenses: ExpenseLite[]; currency: string }) {
  const [expenses, setExpenses] = useSyncedState(initialExpenses);

  function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    void deleteExpense(id);
  }

  if (expenses.length === 0) {
    return <EmptyState prompt="No expenses logged for this period yet." />;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {expenses.map((e) => (
        <li key={e.id} className="group flex items-center gap-3 rounded-lg border border-hairline px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink truncate">{e.description || EXPENSE_CATEGORY_LABELS[e.category]}</p>
            <p className="text-[11px] text-ink-faint mt-0.5">
              {formatMonthDay(e.date)} · {EXPENSE_CATEGORY_LABELS[e.category]} · {PAYMENT_METHOD_LABELS[e.paymentMethod]}
            </p>
          </div>
          <span className="text-sm font-medium text-ink shrink-0">{formatCurrency(e.amount, currency)}</span>
          <button
            type="button"
            onClick={() => handleDelete(e.id)}
            aria-label={`Delete expense "${e.description || EXPENSE_CATEGORY_LABELS[e.category]}"`}
            className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger p-0.5 shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
