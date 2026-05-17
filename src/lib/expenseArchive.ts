import type { Expense } from "@/types/expense";

export const ARCHIVE_SHEET_PREFIX = "Archive_Detail_";
export const GENERAL_SUMMARY_SHEET_NAME = "Generale";
export const GENERAL_SUMMARY_HEADERS = [
  "Anno",
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
  "Totale",
] as const;

export type GeneralSummaryRow = {
  months: number[];
  total: number;
  year: number;
};

export function buildArchiveSheetName(year: number): string {
  return `${ARCHIVE_SHEET_PREFIX}${year}`;
}

export function isArchiveSheetName(sheetName: string): boolean {
  return new RegExp(`^${ARCHIVE_SHEET_PREFIX}\\d{4}$`).test(sheetName);
}

export function getExpenseTargetSheetName(
  expenseDate: string,
  operationalSheetName: string,
  now = new Date(),
): string {
  const expenseYear = Number.parseInt(expenseDate.slice(0, 4), 10);

  if (Number.isFinite(expenseYear) && expenseYear < now.getFullYear()) {
    return buildArchiveSheetName(expenseYear);
  }

  return operationalSheetName;
}

export function buildGeneralSummaryRows(expenses: Expense[]): GeneralSummaryRow[] {
  const rowsByYear = new Map<number, GeneralSummaryRow>();

  for (const expense of expenses) {
    const year = Number.parseInt(expense.date.slice(0, 4), 10);
    const monthIndex = Number.parseInt(expense.date.slice(5, 7), 10) - 1;

    if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    const row = rowsByYear.get(year) ?? {
      months: Array.from({ length: 12 }, () => 0),
      total: 0,
      year,
    };

    row.months[monthIndex] = roundCurrency(row.months[monthIndex] + expense.amount);
    row.total = roundCurrency(row.total + expense.amount);
    rowsByYear.set(year, row);
  }

  return Array.from(rowsByYear.values()).sort((left, right) => left.year - right.year);
}

export function generalSummaryRowsToSheetValues(rows: GeneralSummaryRow[]): Array<Array<number | string>> {
  return [
    [...GENERAL_SUMMARY_HEADERS],
    ...rows.map((row) => [row.year, ...row.months, row.total]),
  ];
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
