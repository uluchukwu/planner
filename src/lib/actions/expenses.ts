"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { ExpenseCategory, PaymentMethod } from "@/generated/prisma/enums";

function refresh() {
  revalidatePath("/", "layout");
}

async function ownedExpenseOrThrow(expenseId: string, userId: string) {
  const expense = await db.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw new Error("Expense not found.");
  return expense;
}

export async function createExpense(input: {
  amount: number;
  date: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  description?: string | null;
  note?: string | null;
}) {
  const { userId } = await verifySession();
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "Enter an amount greater than zero." };

  await db.expense.create({
    data: {
      userId,
      amount: input.amount,
      date: input.date,
      category: input.category,
      paymentMethod: input.paymentMethod,
      description: input.description?.trim() || null,
      note: input.note?.trim() || null,
    },
  });
  refresh();
}

export async function deleteExpense(expenseId: string) {
  const { userId } = await verifySession();
  await ownedExpenseOrThrow(expenseId, userId);
  await db.expense.delete({ where: { id: expenseId } });
  refresh();
}
