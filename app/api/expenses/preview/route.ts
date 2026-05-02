import { NextResponse } from "next/server";
import { classifyExpense } from "@/lib/classifyExpense";
import { getExpenseReview } from "@/lib/expenseReview";
import { parseExpenseInput } from "@/lib/parseExpenseInput";
import type { ExpenseSource } from "@/types/expense";

export const runtime = "nodejs";

type PreviewExpensePayload = {
  rawInput?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  let payload: PreviewExpensePayload;

  try {
    payload = (await request.json()) as PreviewExpensePayload;
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
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

    return NextResponse.json({
      classificationProvider: classification.provider,
      expense,
      review: getExpenseReview(expense),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore inatteso";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
