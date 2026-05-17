import { NextResponse } from "next/server";
import { rebuildGeneralSummary } from "@/lib/googleSheets";

export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await rebuildGeneralSummary());
  } catch (error) {
    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Riepilogo non aggiornato",
        ready: false,
      },
      { status: 500 },
    );
  }
}
