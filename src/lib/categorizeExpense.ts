import type { ExpenseCategory } from "@/types/expense";

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  food: ["bar", "ristorante", "cena", "pranzo", "pizza", "colazione", "aperitivo", "gelato"],
  groceries: ["supermercato", "spesa", "esselunga", "conad", "coop", "lidl", "aldi", "carrefour"],
  transport: ["benzina", "diesel", "treno", "bus", "metro", "taxi", "parcheggio", "pedaggio"],
  home: ["casa", "affitto", "bolletta", "luce", "gas", "internet", "condominio", "ikea"],
  health: ["farmacia", "medico", "visita", "dentista", "analisi", "ospedale"],
  entertainment: ["cinema", "teatro", "concerto", "libro", "videogioco", "museo"],
  shopping: ["vestiti", "scarpe", "amazon", "negozio", "shopping", "zara", "decathlon"],
  subscriptions: ["netflix", "spotify", "abbonamento", "icloud", "prime", "disney", "youtube"],
  travel: ["hotel", "volo", "aereo", "booking", "airbnb", "vacanza", "viaggio"],
  other: [],
};

export function categorizeExpense(description: string): ExpenseCategory {
  const normalized = description.toLocaleLowerCase("it-IT");

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") {
      continue;
    }

    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category as ExpenseCategory;
    }
  }

  return "other";
}
