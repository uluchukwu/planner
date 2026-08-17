import { TaskPriority, TaskStatus, ExpenseCategory, PaymentMethod } from "@/generated/prisma/enums";

// Lightweight, serializable shapes passed from Server Components into Client
// Components — decoupled from Prisma's generated model types so client bundles
// don't pull in server-only code, and so we control exactly what crosses the boundary.
export type TaskLite = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  category: string | null;
  dueTime: string | null;
  estimatedMinutes: number | null;
  dailyPriorityRank: number | null;
  goalId: string | null;
  goalTitle: string | null;
  notes: string | null;
  sortOrder: number;
};

export type GoalLite = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  weeklyPriorityRank: number | null;
  isPriority: boolean;
  progress: number;
  parentTitle: string | null;
  category: string;
  targetDate: string | null;
};

export type HabitLite = {
  id: string;
  name: string;
  weekDots: boolean[]; // aligned to the displayed week's dateKeys, in weekStartsOn order
  currentStreak: number;
};

export type ChecklistItemLite = {
  id: string;
  label: string;
  completed: boolean;
};

export type ExpenseLite = {
  id: string;
  amount: number; // converted from Prisma's Decimal server-side — Decimal instances aren't safe to pass across the server/client boundary
  date: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  description: string | null;
  note: string | null;
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD: "Food",
  TRANSPORT: "Transport",
  BILLS: "Bills",
  EDUCATION: "Education",
  ENTERTAINMENT: "Entertainment",
  SHOPPING: "Shopping",
  HEALTH: "Health",
  BUSINESS: "Business",
  OTHER: "Other",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  OTHER: "Other",
};

export const PRIORITY_QUADRANT_LABELS: Record<TaskPriority, { short: string; long: string }> = {
  URGENT_IMPORTANT: { short: "Do First", long: "Urgent & Important" },
  NOT_URGENT_IMPORTANT: { short: "Schedule", long: "Important, Not Urgent" },
  URGENT_NOT_IMPORTANT: { short: "Delegate", long: "Urgent, Not Important" },
  NOT_URGENT_NOT_IMPORTANT: { short: "Eliminate", long: "Not Urgent, Not Important" },
};
