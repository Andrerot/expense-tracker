export const EXPENSE_CATEGORIES = [
  "food",
  "groceries",
  "transport",
  "home",
  "health",
  "entertainment",
  "shopping",
  "subscriptions",
  "travel",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseSource = "text" | "voice";

export type Expense = {
  id: string;
  amount: number;
  currency: "EUR";
  description: string;
  category: ExpenseCategory;
  date: string;
  rawInput: string;
  source: ExpenseSource;
  createdAt: string;
  notes?: string;
};

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(value as ExpenseCategory);
}
