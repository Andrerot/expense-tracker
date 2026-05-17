import { categorizeExpense } from "@/lib/categorizeExpense";
import {
  findNaturalDateExpressionRanges,
  normalizeItalianText,
  resolveNaturalDate,
  stripNaturalDateExpressions,
} from "@/lib/dates";
import { ITALIAN_NUMBER_WORD_PATTERN, parseItalianInteger } from "@/lib/italianNumbers";
import type { Expense, ExpenseSource } from "@/types/expense";

const CURRENCY_PATTERN = "(?:\\u20ac|euros|euro|eur)";
const AMOUNT_PATTERN = new RegExp(`(?:${CURRENCY_PATTERN}\\s*)?(\\d+(?:[.,]\\d{1,2})?)(?:\\s*${CURRENCY_PATTERN})?`, "gi");
const COMPOUND_NUMERIC_AMOUNT_PATTERN = new RegExp(
  `(?:${CURRENCY_PATTERN}\\s*)?(\\d+)(?:\\s+${CURRENCY_PATTERN})?(?:\\s+e\\s+|\\s+)(\\d{1,2})(?:\\s*(?:centesimi|cent|cents))?(?!\\s*${CURRENCY_PATTERN})(?:\\s*${CURRENCY_PATTERN})?`,
  "gi",
);
const SPOKEN_AMOUNT_PATTERN = new RegExp(
  `\\b(${ITALIAN_NUMBER_WORD_PATTERN})(?:\\s+${CURRENCY_PATTERN})?(?:\\s+e\\s+(${ITALIAN_NUMBER_WORD_PATTERN})(?:\\s*(?:centesimi|cent|cents))?)?(?:\\s*${CURRENCY_PATTERN})?\\b`,
  "gi",
);
const FILLER_WORDS_PATTERN =
  /\b(ho|hai|ha|abbiamo|avete|hanno|speso|spesa|pagato|pagata|comprato|preso|messo|e|ed|per|di|da|in|a|ad|al|alla|allo|alle|ai|agli|con|su|il|lo|la|le|i|gli|un|uno|una|oggi|ieri|domani|sera|mattina|pomeriggio|scorso|scorsa|settimana|fine|mese)\b/gi;

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
  const notes = buildParsingNotes(amountMatches, cleanedInput, now);

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
    notes,
  };
}

function findAmountMatches(input: string): AmountMatch[] {
  const dateRanges = findNaturalDateExpressionRanges(input);
  const amountMatches = [
    ...findCompoundNumericAmountMatches(input),
    ...findSimpleNumericAmountMatches(input),
    ...findSpokenAmountMatches(input),
  ]
    .filter(
      (match) =>
        Number.isFinite(match.amount) &&
        match.amount > 0 &&
        !dateRanges.some((range) => rangesOverlap(match.index, match.index + match.text.length, range.start, range.end)),
    )
    .sort((left, right) => left.index - right.index);

  return removeOverlappingAmountMatches(amountMatches);
}

function findSimpleNumericAmountMatches(input: string): AmountMatch[] {
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
}

function findCompoundNumericAmountMatches(input: string): AmountMatch[] {
  return Array.from(input.matchAll(COMPOUND_NUMERIC_AMOUNT_PATTERN))
    .map((match) => {
      const euros = Number.parseInt(match[1] ?? "", 10);
      const cents = Number.parseInt(match[2] ?? "", 10);
      const text = match[0].trim();

      return {
        amount: euros + cents / 100,
        text,
        index: match.index ?? 0,
        hasCurrency: /(?:\u20ac|\b(?:euros|euro|eur|centesimi|cent|cents)\b)/i.test(text),
      };
    });
}

function findSpokenAmountMatches(input: string): AmountMatch[] {
  const normalized = normalizeItalianText(input);

  return Array.from(normalized.matchAll(SPOKEN_AMOUNT_PATTERN))
    .map((match) => {
      const euros = parseItalianInteger(match[1] ?? "");
      const cents = match[2] ? parseItalianInteger(match[2]) : null;
      const text = match[0].trim();
      const hasCurrency = /(?:\u20ac|\b(?:euros|euro|eur|centesimi|cent|cents)\b)/i.test(text);

      return {
        amount: (euros ?? Number.NaN) + (cents === null ? 0 : cents / 100),
        text,
        index: match.index ?? 0,
        hasCurrency,
      };
    })
    .filter((match) => match.hasCurrency || match.amount > 1);
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

  return stripNaturalDateExpressions(description)
    .replace(FILLER_WORDS_PATTERN, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackDescription(input: string): string {
  const normalizedInput = stripNaturalDateExpressions(input)
    .replace(FILLER_WORDS_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedInput || "Spesa";
}

function buildParsingNotes(amountMatches: AmountMatch[], input: string, now: Date): string | undefined {
  const notes: string[] = [];
  const resolvedDate = resolveNaturalDate(input, now);
  const futureDateDistanceMs = Date.parse(`${resolvedDate}T12:00:00`) - Date.parse(`${toLocalIsoDate(now)}T12:00:00`);

  if (amountMatches.length > 1) {
    notes.push("Input con importi multipli: e stato usato l'importo principale.");
  }

  if (amountMatches[0]?.amount >= 1000) {
    notes.push("Importo elevato da controllare.");
  }

  if (futureDateDistanceMs > 31 * 24 * 60 * 60 * 1000) {
    notes.push("Data futura lontana da controllare.");
  }

  if (findNaturalDateExpressionRanges(input).length > 1) {
    notes.push("Input con date multiple da controllare.");
  }

  return notes.length > 0 ? notes.join(" ") : undefined;
}

function removeOverlappingAmountMatches(matches: AmountMatch[]): AmountMatch[] {
  const selectedMatches: AmountMatch[] = [];

  for (const match of matches) {
    const overlapsSelected = selectedMatches.some((selected) =>
      rangesOverlap(match.index, match.index + match.text.length, selected.index, selected.index + selected.text.length),
    );

    if (!overlapsSelected) {
      selectedMatches.push(match);
    }
  }

  return selectedMatches.sort((left, right) => left.index - right.index);
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
