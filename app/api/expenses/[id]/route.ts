import { NextResponse } from "next/server";
import { deleteExpense } from "@/lib/googleSheets";

export const runtime = "nodejs";

// type DeleteExpenseContext = {
//   params: Promise<{ id: string }> | { id: string };
// };

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
