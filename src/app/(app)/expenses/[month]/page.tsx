import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { todayKey, shiftMonthKey, formatMonthLabel, addDays } from "@/lib/date/week";
import { computeCategoryBreakdown } from "@/lib/expenses";
import { formatCurrency } from "@/lib/format";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { CategoryBreakdown } from "@/components/expenses/CategoryBreakdown";
import { ExpenseLite } from "@/lib/types";

function isValidMonthKey(key: string) {
  return /^\d{4}-\d{2}$/.test(key);
}

export default async function ExpensesMonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!isValidMonthKey(month)) notFound();

  const user = await getCurrentUser();
  const today = todayKey();
  const isCurrentMonth = month === today.slice(0, 7);

  const rawExpenses = await db.expense.findMany({
    where: { userId: user.id, date: { startsWith: month } },
    orderBy: { date: "desc" },
  });

  const expenses: ExpenseLite[] = rawExpenses.map((e) => ({
    id: e.id,
    amount: Number(e.amount),
    date: e.date,
    category: e.category,
    paymentMethod: e.paymentMethod,
    description: e.description,
    note: e.note,
  }));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const breakdown = computeCategoryBreakdown(expenses);
  const monthStart = `${month}-01`;
  const monthEnd = addDays(`${shiftMonthKey(month, 1)}-01`, -1);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">{isCurrentMonth ? "This month" : "Month"}</p>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">{formatMonthLabel(month)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/expenses/${shiftMonthKey(month, -1)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
            ← Prev
          </Link>
          {!isCurrentMonth && (
            <Link href={`/expenses/${today.slice(0, 7)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
              This month
            </Link>
          )}
          <Link href={`/expenses/${shiftMonthKey(month, 1)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
            Next →
          </Link>
          <Link href={`/expenses/week/${today}`} className="rounded-lg bg-accent-soft px-3 py-1.5 text-sm text-accent-strong font-medium hover:bg-accent-soft/70">
            View by week
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Expenses</h2>
            <span className="text-sm font-medium text-ink">{formatCurrency(total, user.currency)} total</span>
          </div>
          <div className="mb-3">
            <ExpenseForm defaultDate={isCurrentMonth ? today : monthStart} minDate={monthStart} maxDate={monthEnd} />
          </div>
          <ExpenseList initialExpenses={expenses} currency={user.currency} />
        </section>

        <section className="rounded-xl border border-hairline bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink mb-3">By category</h2>
          <CategoryBreakdown totals={breakdown} currency={user.currency} />
        </section>
      </div>
    </div>
  );
}
