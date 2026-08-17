import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { todayKey, getWeekDays, addDays, formatWeekRange } from "@/lib/date/week";
import { computeCategoryBreakdown } from "@/lib/expenses";
import { formatCurrency } from "@/lib/format";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { CategoryBreakdown } from "@/components/expenses/CategoryBreakdown";
import { ExpenseLite } from "@/lib/types";

function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export default async function ExpensesWeekPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateKey(date)) notFound();

  const user = await getCurrentUser();
  const today = todayKey();
  const dateKeys = getWeekDays(date, user.weekStartsOn);
  const isCurrentWeek = dateKeys.includes(today);

  const rawExpenses = await db.expense.findMany({
    where: { userId: user.id, date: { in: dateKeys } },
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
  const weekStart = dateKeys[0];
  const weekEnd = dateKeys[6];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">{isCurrentWeek ? "This week" : "Week"}</p>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Week of {formatWeekRange(weekStart, weekEnd)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/expenses/week/${addDays(weekStart, -7)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
            ← Prev
          </Link>
          {!isCurrentWeek && (
            <Link href={`/expenses/week/${today}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
              This week
            </Link>
          )}
          <Link href={`/expenses/week/${addDays(weekStart, 7)}`} className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken">
            Next →
          </Link>
          <Link href={`/expenses/${weekStart.slice(0, 7)}`} className="rounded-lg bg-accent-soft px-3 py-1.5 text-sm text-accent-strong font-medium hover:bg-accent-soft/70">
            View by month
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
            <ExpenseForm defaultDate={isCurrentWeek ? today : weekStart} minDate={weekStart} maxDate={weekEnd} />
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
