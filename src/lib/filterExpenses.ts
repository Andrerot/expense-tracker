import { toIsoDate } from "@/lib/dates";
import type { Expense, ExpenseCategory, ExpenseSource } from "@/types/expense";

export type ExpensePeriodFilter = "all" | "today" | "week" | "month" | "custom";

export type ExpenseFilters = {
  category: ExpenseCategory | "all";
  period: ExpensePeriodFilter;
  query: string;
  source: ExpenseSource | "all";
  customFrom: string;
  customTo: string;
};

export const DEFAULT_EXPENSE_FILTERS: ExpenseFilters = {
  category: "all",
  period: "all",
  query: "",
  source: "all",
  customFrom: "",
  customTo: "",
};

export function filterExpenses(
  expenses: Expense[],
  filters: ExpenseFilters,
  now = new Date(),
): Expense[] {
  const normalizedQuery = normalizeSearchText(filters.query);

  return expenses.filter((expense) => {
    if (normalizedQuery && !matchesSearchQuery(expense, normalizedQuery)) {
      return false;
    }

    if (filters.category !== "all" && expense.category !== filters.category) {
      return false;
    }

    if (filters.source !== "all" && expense.source !== filters.source) {
      return false;
    }

    return isExpenseInPeriod(expense.date, filters, now);
  });
}

export function hasActiveExpenseFilters(filters: ExpenseFilters): boolean {
  return (
    filters.category !== "all" ||
    filters.period !== "all" ||
    Boolean(filters.query.trim()) ||
    filters.source !== "all" ||
    Boolean(filters.customFrom) ||
    Boolean(filters.customTo)
  );
}

function isExpenseInPeriod(date: string, filters: ExpenseFilters, now: Date): boolean {
  if (filters.period === "all") {
    return true;
  }

  if (filters.period === "today") {
    return date === toIsoDate(now);
  }

  if (filters.period === "month") {
    return date.slice(0, 7) === toIsoDate(now).slice(0, 7);
  }

  if (filters.period === "week") {
    const start = getStartOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return date >= toIsoDate(start) && date <= toIsoDate(end);
  }

  if (filters.period === "custom") {
    if (filters.customFrom && date < filters.customFrom) {
      return false;
    }

    if (filters.customTo && date > filters.customTo) {
      return false;
    }
  }

  return true;
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function matchesSearchQuery(expense: Expense, normalizedQuery: string): boolean {
  return [expense.description, expense.rawInput, expense.notes ?? ""]
    .map(normalizeSearchText)
    .some((value) => value.includes(normalizedQuery));
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
