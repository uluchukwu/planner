import { db } from "@/lib/db";
import { todayKey } from "@/lib/date/week";
import { computeCategoryBreakdown } from "@/lib/expenses";
import { requireMobileUser, jsonResponse, corsPreflightResponse } from "@/lib/auth/mobileAuth";
import { ExpenseCategory, PaymentMethod } from "@/generated/prisma/enums";

function isValidMonthKey(key: string) {
  return /^\d{4}-\d{2}$/.test(key);
}

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const month = monthParam && isValidMonthKey(monthParam) ? monthParam : todayKey().slice(0, 7);

  const rawExpenses = await db.expense.findMany({
    where: { userId, date: { startsWith: month } },
    orderBy: { date: "desc" },
  });

  const expenses = rawExpenses.map((e) => ({
    id: e.id,
    amount: Number(e.amount),
    date: e.date,
    category: e.category,
    paymentMethod: e.paymentMethod,
    description: e.description,
  }));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return jsonResponse({
    month,
    currency: user.currency,
    total,
    expenses,
    breakdown: computeCategoryBreakdown(expenses),
  });
}

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return jsonResponse({ error: "Enter an amount greater than zero." }, 400);

  const date = typeof body?.date === "string" ? body.date : todayKey();
  const category = (body?.category as ExpenseCategory) ?? "OTHER";
  const paymentMethod = (body?.paymentMethod as PaymentMethod) ?? "CARD";
  const description = typeof body?.description === "string" ? body.description.trim() || null : null;

  const expense = await db.expense.create({
    data: { userId, amount, date, category, paymentMethod, description },
  });

  return jsonResponse({ id: expense.id, amount: Number(expense.amount), date: expense.date, category: expense.category });
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
