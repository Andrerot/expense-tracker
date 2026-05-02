import { NextResponse } from "next/server";
import { classifyExpense } from "@/lib/classifyExpense";
import { parseExpenseInput } from "@/lib/parseExpenseInput";
import { appendExpense, listExpenses } from "@/lib/googleSheets";
import { isExpenseCategory, type Expense, type ExpenseSource } from "@/types/expense";

export const runtime = "nodejs";

type CreateExpensePayload = {
  expense?: unknown;
  rawInput?: unknown;
  source?: unknown;
};

type ReviewedExpensePayload = Partial<Pick<Expense, "amount" | "category" | "date" | "description" | "notes" | "rawInput" | "source">>;

export async function GET() {
  try {
    const expenses = await listExpenses();
    return NextResponse.json({ expenses });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore inatteso" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let payload: CreateExpensePayload;

  try {
    payload = (await request.json()) as CreateExpensePayload;
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  if (isReviewedExpensePayload(payload.expense)) {
    try {
      const expense = createReviewedExpense(payload.expense);
      await appendExpense(expense);
      return NextResponse.json(expense, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore inatteso";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const rawInput = typeof payload.rawInput === "string" ? payload.rawInput.trim() : "";
  const source: ExpenseSource = payload.source === "voice" ? "voice" : "text";

  if (!rawInput) {
    return NextResponse.json({ error: "Inserisci una spesa" }, { status: 400 });
  }

  try {
    const expense = parseExpenseInput(rawInput, source);
    const classification = await classifyExpense({
      rawInput: expense.rawInput,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
    });
    expense.category = classification.category;
    await appendExpense(expense);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore inatteso";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function isReviewedExpensePayload(value: unknown): value is ReviewedExpensePayload {
  return typeof value === "object" && value !== null;
}

function createReviewedExpense(payload: ReviewedExpensePayload): Expense {
  const amount = typeof payload.amount === "number" ? payload.amount : Number.NaN;
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const date = typeof payload.date === "string" ? payload.date.trim() : "";
  const rawInput = typeof payload.rawInput === "string" ? payload.rawInput.trim() : "";
  const source: ExpenseSource = payload.source === "voice" ? "voice" : "text";

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Importo non valido");
  }

  if (!description) {
    throw new Error("Descrizione mancante");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data non valida");
  }

  if (!rawInput) {
    throw new Error("Input originale mancante");
  }

  if (typeof payload.category !== "string" || !isExpenseCategory(payload.category)) {
    throw new Error("Categoria non valida");
  }

  return {
    id: `exp_${crypto.randomUUID()}`,
    amount,
    currency: "EUR",
    description,
    category: payload.category,
    date,
    rawInput,
    source,
    createdAt: new Date().toISOString(),
    notes: typeof payload.notes === "string" && payload.notes.trim() ? payload.notes.trim() : undefined,
  };
}
