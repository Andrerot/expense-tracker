import { NextResponse } from "next/server";
import { deleteExpense, getExpense, updateExpense } from "@/lib/googleSheets";
import { isExpenseCategory, type Expense } from "@/types/expense";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: any) {
  const params = await context.params;
  const id = params.id?.trim();

  if (!id) {
    return NextResponse.json({ error: "ID spesa mancante" }, { status: 400 });
  }

  try {
    const deleted = await deleteExpense(id);

    if (!deleted) {
      return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore inatteso" },
      { status: 500 },
    );
  }
}

type UpdateExpensePayload = Partial<Pick<Expense, "amount" | "category" | "date" | "description" | "notes">>;

export async function PATCH(request: Request, context: any) {
  const params = await context.params;
  const id = params.id?.trim();

  if (!id) {
    return NextResponse.json({ error: "ID spesa mancante" }, { status: 400 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  try {
    const existingExpense = await getExpense(id);

    if (!existingExpense) {
      return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
    }

    const updatedExpense = createUpdatedExpense(existingExpense, payload);
    const savedExpense = await updateExpense(updatedExpense);

    if (!savedExpense) {
      return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
    }

    return NextResponse.json(savedExpense);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore inatteso" },
      { status: 400 },
    );
  }
}

function createUpdatedExpense(existingExpense: Expense, payload: unknown): Expense {
  if (!isUpdateExpensePayload(payload)) {
    throw new Error("Payload non valido");
  }

  const amount = typeof payload.amount === "number" ? payload.amount : Number.NaN;
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const date = typeof payload.date === "string" ? payload.date.trim() : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Importo non valido");
  }

  if (!description) {
    throw new Error("Descrizione mancante");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data non valida");
  }

  if (typeof payload.category !== "string" || !isExpenseCategory(payload.category)) {
    throw new Error("Categoria non valida");
  }

  return {
    ...existingExpense,
    amount,
    category: payload.category,
    date,
    description,
    notes: typeof payload.notes === "string" && payload.notes.trim() ? payload.notes.trim() : undefined,
  };
}

function isUpdateExpensePayload(value: unknown): value is UpdateExpensePayload {
  return typeof value === "object" && value !== null;
}
