import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return {
        url: pathToFileURL(resolve(process.cwd(), "node_modules", "next", "server.js")).href,
        shortCircuit: true,
      };
    }

    if (specifier.startsWith("@/")) {
      return {
        url: pathToFileURL(resolve(process.cwd(), "src", `${specifier.slice(2)}.ts`)).href,
        shortCircuit: true,
      };
    }

    return nextResolve(specifier, context);
  },
});

const exportRoute = await import("../app/api/expenses/export/route.ts");
const storageDiagnosticsRoute = await import("../app/api/storage/diagnostics/route.ts");
const storageSummaryRoute = await import("../app/api/storage/summary/route.ts");
const { appendLocalExpense } = await import("../src/lib/localExpenseStore.ts");
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function clearGoogleEnv() {
  delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  delete process.env.GOOGLE_SHEETS_SHARE_WITH_EMAIL;
}

function makeExpense(overrides = {}) {
  return {
    id: "exp_csv",
    amount: 12.5,
    currency: "EUR",
    description: 'pizza, "speciale"',
    category: "food",
    date: "2026-05-17",
    rawInput: '12,50 pizza "speciale"',
    source: "text",
    createdAt: "2026-05-17T10:00:00.000Z",
    notes: "nota con, virgola",
    ...overrides,
  };
}

test("export returns CSV with headers and escaped expense cells", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "spendino-export-"));
  process.env.SPENDINO_LOCAL_EXPENSES_FILE = join(tempDir, "expenses.json");
  clearGoogleEnv();

  try {
    await appendLocalExpense(makeExpense());

    const response = await exportRoute.GET(new Request("http://localhost/api/expenses/export"));
    const csv = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("Content-Type") ?? "", /text\/csv/);
    assert.match(response.headers.get("Content-Disposition") ?? "", /spendino-expenses-current-/);
    assert.match(csv, /^id,date,amount,currency,category,description,rawInput,source,createdAt,notes/);
    assert.match(csv, /"pizza, ""speciale"""/);
    assert.match(csv, /"12,50 pizza ""speciale"""/);
    assert.match(csv, /"nota con, virgola"/);

    const completeResponse = await exportRoute.GET(
      new Request("http://localhost/api/expenses/export?scope=all"),
    );

    assert.equal(completeResponse.status, 200);
    assert.match(completeResponse.headers.get("Content-Disposition") ?? "", /spendino-expenses-complete-/);
  } finally {
    delete process.env.SPENDINO_LOCAL_EXPENSES_FILE;
    await rm(tempDir, { force: true, recursive: true });
  }
});

test("storage diagnostics report local mode without Google credentials", async () => {
  clearGoogleEnv();

  const infoResponse = await storageDiagnosticsRoute.GET();
  const info = await infoResponse.json();

  assert.equal(infoResponse.status, 200);
  assert.equal(info.mode, "local");
  assert.equal(info.sheetName, "Expenses");
  assert.equal(info.spreadsheetIdConfigured, false);

  const diagnosticsResponse = await storageDiagnosticsRoute.POST();
  const diagnostics = await diagnosticsResponse.json();

  assert.equal(diagnosticsResponse.status, 200);
  assert.equal(diagnostics.mode, "local");
  assert.equal(diagnostics.archiveSheetCount, 0);
  assert.deepEqual(diagnostics.archiveSheetNames, []);
  assert.equal(diagnostics.operationalSheetReady, true);
  assert.equal(diagnostics.ready, true);
  assert.equal(diagnostics.summarySheetName, "Generale");
  assert.equal(diagnostics.summarySheetReady, true);
  assert.equal(typeof diagnostics.checkedAt, "string");
});

test("storage summary rebuild reports local aggregate metadata", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "spendino-summary-"));
  process.env.SPENDINO_LOCAL_EXPENSES_FILE = join(tempDir, "expenses.json");
  clearGoogleEnv();

  try {
    await appendLocalExpense(makeExpense({ id: "exp_summary_2025", amount: 10, date: "2025-01-01" }));
    await appendLocalExpense(makeExpense({ id: "exp_summary_2026", amount: 20, date: "2026-05-17" }));

    const response = await storageSummaryRoute.POST();
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.mode, "local");
    assert.equal(data.sheetName, "Generale");
    assert.equal(data.expenseCount, 2);
    assert.equal(data.yearCount, 2);
    assert.equal(typeof data.checkedAt, "string");
  } finally {
    delete process.env.SPENDINO_LOCAL_EXPENSES_FILE;
    await rm(tempDir, { force: true, recursive: true });
  }
});

for (const { name, run } of tests) {
  await run();
  console.log(`ok - ${name}`);
}
