import { ExpenseCategory } from "@/generated/prisma/enums";

export type CategoryTotal = { category: ExpenseCategory; total: number; pct: number };

// Pure, DB-free so it's testable in isolation — mirrors lib/habits.ts.
export function computeCategoryBreakdown(expenses: { category: ExpenseCategory; amount: number }[]): CategoryTotal[] {
  const totals = new Map<ExpenseCategory, number>();
  let grandTotal = 0;
  for (const e of expenses) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    grandTotal += e.amount;
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total, pct: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}
