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

  if (expense.notes?.includes("Importo elevato")) {
    reasons.push("Importo elevato");
  }

  if (expense.notes?.includes("Data futura lontana")) {
    reasons.push("Data futura lontana");
  }

  if (expense.notes?.includes("date multiple")) {
    reasons.push("Date multiple rilevate");
  }

  return {
    required: reasons.length > 0,
    reasons,
  };
}
