import { NextResponse } from "next/server";
import { listExpenses } from "@/lib/googleSheets";
import type { Expense } from "@/types/expense";

export const runtime = "nodejs";

const CSV_HEADERS = [
  "id",
  "date",
  "amount",
  "currency",
  "category",
  "description",
  "rawInput",
  "source",
  "createdAt",
  "notes",
];

export async function GET() {
  try {
    const expenses = await listExpenses(5000);
    const csv = toCsv(expenses);

    return new NextResponse(csv, {
      headers: {
        "Content-Disposition": `attachment; filename="spendino-expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Non sono riuscito a esportare le spese" },
      { status: 500 },
    );
  }
}

function toCsv(expenses: Expense[]): string {
  const rows = expenses.map((expense) => [
    expense.id,
    expense.date,
    String(expense.amount),
    expense.currency,
    expense.category,
    expense.description,
    expense.rawInput,
    expense.source,
    expense.createdAt,
    expense.notes ?? "",
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function escapeCsvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
