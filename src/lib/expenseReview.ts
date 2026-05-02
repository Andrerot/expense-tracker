import type { Expense } from "@/types/expense";

export type ExpenseReview = {
  required: boolean;
  reasons: string[];
};

export function getExpenseReview(expense: Expense): ExpenseReview {
  const reasons: string[] = [];

  if (expense.category === "other") {
    reasons.push("Categoria incerta");
  }

  if (expense.description.trim().length < 3 || expense.description.toLowerCase() === "spesa") {
    reasons.push("Descrizione poco chiara");
  }

  if (expense.notes?.includes("importi multipli")) {
    reasons.push("Importi multipli rilevati");
  }

  return {
    required: reasons.length > 0,
    reasons,
  };
}
