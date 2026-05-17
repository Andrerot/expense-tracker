import { ITALIAN_NUMBER_WORD_PATTERN, parseItalianInteger } from "@/lib/italianNumbers";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = new Map([
  ["domenica", 0],
  ["lunedi", 1],
  ["martedi", 2],
  ["mercoledi", 3],
  ["giovedi", 4],
  ["venerdi", 5],
  ["sabato", 6],
]);

const MONTHS = new Map([
  ["gennaio", 0],
  ["febbraio", 1],
  ["marzo", 2],
  ["aprile", 3],
  ["maggio", 4],
  ["giugno", 5],
  ["luglio", 6],
  ["agosto", 7],
  ["settembre", 8],
  ["ottobre", 9],
  ["novembre", 10],
  ["dicembre", 11],
]);

const RELATIVE_DATE_PATTERN = new RegExp(
  `\\b(oggi|ieri|l[' ]?altro ieri|altro ieri|domani|(?:\\d+|${ITALIAN_NUMBER_WORD_PATTERN})\\s+giorni fa|settimana scorsa|scorsa settimana|settimana prossima|prossima settimana|mese scorso|scorso mese|scorso weekend|weekend scorso|questo weekend|fine mese|a fine mese|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)\\b`,
  "gi",
);
const NUMERIC_DATE_PATTERN = /\b([0-3]?\d)[/.-]([01]?\d)(?:[/.-](\d{2,4}))?\b/;
const TEXTUAL_DATE_PATTERN = new RegExp(
  "\\b(?:(?:il|lo|la|del|di)\\s+)?(primo|un|uno|una|1|[1-9]|[12]\\d|3[01])(?:\\s*(?:\\u00b0|\\u00ba|o))?(?:\\s+di)?\\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\\s+(\\d{2,4}))?\\b",
);
const NUMERIC_DATE_GLOBAL_PATTERN = new RegExp(NUMERIC_DATE_PATTERN.source, "g");
const TEXTUAL_DATE_GLOBAL_PATTERN = new RegExp(TEXTUAL_DATE_PATTERN.source, "g");
const RELATIVE_DATE_GLOBAL_PATTERN = new RegExp(RELATIVE_DATE_PATTERN.source, "gi");
const DAYS_AGO_PATTERN = new RegExp(`\\b(\\d+|${ITALIAN_NUMBER_WORD_PATTERN})\\s+giorni fa\\b`);

export type TextRange = {
  end: number;
  start: number;
};

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveNaturalDate(input: string, now = new Date()): string {
  const normalized = normalizeItalianText(input);

  if (/\bl[' ]?altro ieri\b|\baltro ieri\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() - 2 * DAY_IN_MS));
  }

  const daysAgo = resolveDaysAgo(normalized, now);

  if (daysAgo) {
    return daysAgo;
  }

  if (/\bieri\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() - DAY_IN_MS));
  }

  if (/\bdomani\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() + DAY_IN_MS));
  }

  if (/\b(settimana scorsa|scorsa settimana)\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() - 7 * DAY_IN_MS));
  }

  if (/\b(settimana prossima|prossima settimana)\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() + 7 * DAY_IN_MS));
  }

  if (/\b(mese scorso|scorso mese)\b/.test(normalized)) {
    return toIsoDate(addMonthsClamped(now, -1));
  }

  if (/\b(scorso weekend|weekend scorso)\b/.test(normalized)) {
    return toIsoDate(resolveWeekendDate(now, "previous"));
  }

  if (/\bquesto weekend\b/.test(normalized)) {
    return toIsoDate(resolveWeekendDate(now, "current"));
  }

  if (/\b(fine mese|a fine mese)\b/.test(normalized)) {
    return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  const explicitDate = resolveExplicitDate(normalized, now);

  if (explicitDate) {
    return explicitDate;
  }

  for (const [weekday, targetDay] of WEEKDAYS.entries()) {
    if (new RegExp(`\\b${weekday}(?:\\s+scorso|\\s+scorsa)?\\b`).test(normalized)) {
      const currentDay = now.getDay();
      const daysBack = (currentDay - targetDay + 7) % 7 || 7;
      return toIsoDate(new Date(now.getTime() - daysBack * DAY_IN_MS));
    }
  }

  return toIsoDate(now);
}

export function stripNaturalDateExpressions(input: string): string {
  return normalizeItalianText(input)
    .replace(TEXTUAL_DATE_GLOBAL_PATTERN, " ")
    .replace(NUMERIC_DATE_GLOBAL_PATTERN, " ")
    .replace(RELATIVE_DATE_GLOBAL_PATTERN, " ");
}

export function findNaturalDateExpressionRanges(input: string): TextRange[] {
  const normalized = normalizeItalianText(input);

  return [
    ...findPatternRanges(normalized, TEXTUAL_DATE_GLOBAL_PATTERN),
    ...findPatternRanges(normalized, NUMERIC_DATE_GLOBAL_PATTERN),
    ...findPatternRanges(normalized, RELATIVE_DATE_GLOBAL_PATTERN),
  ];
}

export function isSameMonth(dateIso: string, now = new Date()): boolean {
  return dateIso.slice(0, 7) === toIsoDate(now).slice(0, 7);
}

export function normalizeItalianText(input: string): string {
  return input
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveDaysAgo(normalizedInput: string, now: Date): string | null {
  const match = normalizedInput.match(DAYS_AGO_PATTERN);

  if (!match) {
    return null;
  }

  const amount = parseFlexibleInteger(match[1]);

  if (!amount || amount < 1) {
    return null;
  }

  return toIsoDate(new Date(now.getTime() - amount * DAY_IN_MS));
}

function resolveExplicitDate(normalizedInput: string, now: Date): string | null {
  const numericDate = parseNumericDate(normalizedInput, now);

  if (numericDate) {
    return numericDate;
  }

  const textualDate = parseTextualDate(normalizedInput, now);

  if (textualDate) {
    return textualDate;
  }

  return null;
}

function parseNumericDate(input: string, now: Date): string | null {
  const match = input.match(NUMERIC_DATE_PATTERN);

  if (!match) {
    return null;
  }

  const day = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10) - 1;
  const year = parseExplicitYear(match[3], now);

  return buildValidIsoDate(year, monthIndex, day);
}

function parseTextualDate(input: string, now: Date): string | null {
  const match = input.match(TEXTUAL_DATE_PATTERN);

  if (!match) {
    return null;
  }

  const day = ["primo", "un", "uno", "una"].includes(match[1])
    ? 1
    : Number.parseInt(match[1], 10);
  const monthIndex = MONTHS.get(match[2]);
  const year = parseExplicitYear(match[3], now);

  if (monthIndex === undefined) {
    return null;
  }

  return buildValidIsoDate(year, monthIndex, day);
}

function parseExplicitYear(value: string | undefined, now: Date): number {
  if (!value) {
    return now.getFullYear();
  }

  const year = Number.parseInt(value, 10);

  if (value.length === 2) {
    return 2000 + year;
  }

  return year;
}

function buildValidIsoDate(year: number, monthIndex: number, day: number): string | null {
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, monthIndex, day);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
    return null;
  }

  return toIsoDate(date);
}

function addMonthsClamped(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function resolveWeekendDate(date: Date, direction: "current" | "previous"): Date {
  const currentDay = date.getDay();
  const saturday = 6;
  const daysToCurrentSaturday = (saturday - currentDay + 7) % 7;
  const offset = direction === "current" ? daysToCurrentSaturday : -(currentDay + 1);
  return new Date(date.getTime() + offset * DAY_IN_MS);
}

function parseFlexibleInteger(value: string): number | null {
  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  return parseItalianInteger(value);
}

function findPatternRanges(input: string, pattern: RegExp): TextRange[] {
  const ranges: TextRange[] = [];
  pattern.lastIndex = 0;

  for (let match = pattern.exec(input); match; match = pattern.exec(input)) {
    ranges.push({
      end: (match.index ?? 0) + match[0].length,
      start: match.index ?? 0,
    });
  }

  return ranges;
}
