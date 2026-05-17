import type { ExpenseCategory } from "@/types/expense";

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  food: ["bar", "ristorante", "cena", "pranzo", "pizza", "colazione", "aperitivo", "gelato", "drink", "pub", "birra", "caffe", "cornetto", "pizzeria"],
  groceries: ["supermercato", "spesa", "esselunga", "conad", "coop", "lidl", "aldi", "carrefour", "eurospin", "alimentari", "macelleria", "panificio"],
  transport: ["benzina", "diesel", "treno", "bus", "metro", "taxi", "parcheggio", "pedaggio", "bollo", "assicurazione auto", "meccanico", "gomme"],
  home: ["casa", "affitto", "bolletta", "luce", "gas", "internet", "condominio", "ikea", "mutuo", "rata mutuo", "arredamento", "idraulico", "elettricista"],
  health: ["farmacia", "medico", "visita", "dentista", "analisi", "ospedale", "parrucchiere", "barbiere", "ottico", "oculista", "fisioterapia"],
  entertainment: ["cinema", "teatro", "concerto", "libro", "videogioco", "museo", "manga", "fumetto", "fumetti", "kagura"],
  shopping: ["vestiti", "scarpe", "amazon", "negozio", "shopping", "zara", "decathlon", "regalo", "elettronica", "telefono"],
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
