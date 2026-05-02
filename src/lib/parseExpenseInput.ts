import { categorizeExpense } from "@/lib/categorizeExpense";
import { normalizeItalianText, resolveNaturalDate } from "@/lib/dates";
import type { Expense, ExpenseSource } from "@/types/expense";

const AMOUNT_PATTERN = /(?:(?:\u20ac|euros|euro|eur)\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:\u20ac|euros|euro|eur))?/gi;
const FILLER_WORDS_PATTERN =
  /\b(ho|hai|ha|abbiamo|avete|hanno|speso|spesa|pagato|pagata|comprato|preso|messo|e|ed|per|di|da|in|a|ad|al|alla|allo|alle|ai|agli|con|su|il|lo|la|le|i|gli|un|uno|una|oggi|ieri|domani|sera|mattina|pomeriggio|scorso|scorsa|settimana|fine|mese)\b/gi;
const DATE_LIKE_PATTERN =
  /\b(oggi|ieri|domani|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|settimana scorsa|scorsa settimana|fine mese|a fine mese)\b/gi;

type AmountMatch = {
  amount: number;
  text: string;
  index: number;
  hasCurrency: boolean;
};

export function parseExpenseInput(rawInput: string, source: ExpenseSource = "text", now = new Date()): Expense {
  const cleanedInput = rawInput.trim();

  if (!cleanedInput) {
    throw new Error("Scrivi una frase con importo e descrizione, ad esempio: 12,50 pranzo al bar");
  }

  const amountMatches = findAmountMatches(cleanedInput);
  const mainAmount = chooseMainAmount(amountMatches);

  if (!mainAmount) {
    throw new Error("Non ho trovato un importo. Prova con una frase tipo: 18 euro pizza ieri sera");
  }

  const description = buildDescription(cleanedInput, amountMatches);
  const safeDescription = description || buildFallbackDescription(cleanedInput);
  const createdAt = now.toISOString();

  return {
    id: `exp_${crypto.randomUUID()}`,
    amount: mainAmount.amount,
    currency: "EUR",
    description: safeDescription,
    category: categorizeExpense(safeDescription),
    date: resolveNaturalDate(cleanedInput, now),
    rawInput: cleanedInput,
    source,
    createdAt,
    notes: amountMatches.length > 1 ? "Input con importi multipli: e stato usato l'importo principale." : undefined,
  };
}

function findAmountMatches(input: string): AmountMatch[] {
  return Array.from(input.matchAll(AMOUNT_PATTERN))
    .map((match) => {
      const text = match[0].trim();
      const amount = Number.parseFloat((match[1] ?? "").replace(",", "."));

      return {
        amount,
        text,
        index: match.index ?? 0,
        hasCurrency: /(?:\u20ac|\b(?:euros|euro|eur)\b)/i.test(text),
      };
    })
    .filter((match) => Number.isFinite(match.amount) && match.amount > 0);
}

function chooseMainAmount(matches: AmountMatch[]): AmountMatch | null {
  if (matches.length === 0) {
    return null;
  }

  return matches.find((match) => match.hasCurrency) ?? matches[0];
}

function buildDescription(input: string, amountMatches: AmountMatch[]): string {
  const normalizedInput = normalizeItalianText(input);
  let description = normalizedInput;

  for (const match of amountMatches) {
    description = description.replace(normalizeItalianText(match.text), " ");
  }

  return description
    .replace(DATE_LIKE_PATTERN, " ")
    .replace(FILLER_WORDS_PATTERN, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackDescription(input: string): string {
  const normalizedInput = normalizeItalianText(input)
    .replace(FILLER_WORDS_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedInput || "Spesa";
}
