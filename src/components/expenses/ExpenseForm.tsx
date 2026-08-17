"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { createExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { ExpenseCategory, PaymentMethod } from "@/generated/prisma/enums";

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function ExpenseForm({ defaultDate, minDate, maxDate }: { defaultDate: string; minDate: string; maxDate: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const amount = Number(formData.get("amount"));
    const date = String(formData.get("date") ?? defaultDate);
    const category = String(formData.get("category") ?? "OTHER") as ExpenseCategory;
    const paymentMethod = String(formData.get("paymentMethod") ?? "CARD") as PaymentMethod;
    const description = String(formData.get("description") ?? "").trim() || null;

    setError(null);
    const result = await createExpense({ amount, date, category, paymentMethod, description });
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Add expense
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-hairline bg-surface p-4 flex flex-col gap-3">
      {error && <p className="text-xs text-danger bg-danger-soft rounded-lg px-2.5 py-1.5">{error}</p>}
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1 w-28">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input id="expense-amount" name="amount" type="number" step="0.01" min="0.01" required autoFocus />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="expense-date">Date</Label>
          <Input id="expense-date" name="date" type="date" defaultValue={defaultDate} min={minDate} max={maxDate} required />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
          <Label htmlFor="expense-category">Category</Label>
          <Select id="expense-category" name="category" defaultValue="OTHER">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[8rem]">
          <Label htmlFor="expense-paymentMethod">Paid via</Label>
          <Select id="expense-paymentMethod" name="paymentMethod" defaultValue="CARD">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="expense-description">Description</Label>
        <Input id="expense-description" name="description" placeholder="Optional — e.g. Groceries" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm">Add expense</Button>
      </div>
    </form>
  );
}
