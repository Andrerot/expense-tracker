import { NextResponse } from "next/server";
import { getStorageInfo, runStorageDiagnostics } from "@/lib/googleSheets";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getStorageInfo());
}

export async function POST() {
  try {
    return NextResponse.json(await runStorageDiagnostics());
  } catch (error) {
    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Diagnostica storage non riuscita",
        ready: false,
      },
      { status: 500 },
    );
  }
}
