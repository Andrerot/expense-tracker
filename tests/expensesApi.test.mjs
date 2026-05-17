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

const { GET, POST } = await import("../app/api/expenses/route.ts");
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function clearGoogleEnv() {
  delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
}

function jsonRequest(payload) {
  return new Request("http://localhost/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

test("GET starts empty and POST creates raw parsed expenses in local storage", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "spendino-api-expenses-"));
  process.env.SPENDINO_LOCAL_EXPENSES_FILE = join(tempDir, "expenses.json");
  clearGoogleEnv();

  try {
    const emptyResponse = await GET();
    const emptyData = await emptyResponse.json();

    assert.equal(emptyResponse.status, 200);
    assert.deepEqual(emptyData.expenses, []);

    const createResponse = await POST(jsonRequest({ rawInput: "12,50 pizza ieri", source: "text" }));
    const createdExpense = await createResponse.json();

    assert.equal(createResponse.status, 201);
    assert.equal(createdExpense.amount, 12.5);
    assert.equal(createdExpense.description, "pizza");
    assert.equal(createdExpense.category, "food");
    assert.equal(createdExpense.currency, "EUR");
    assert.equal(createdExpense.rawInput, "12,50 pizza ieri");
    assert.equal(createdExpense.source, "text");

    const listResponse = await GET();
    const listData = await listResponse.json();

    assert.equal(listResponse.status, 200);
    assert.equal(listData.expenses.length, 1);
    assert.equal(listData.expenses[0].id, createdExpense.id);
  } finally {
    delete process.env.SPENDINO_LOCAL_EXPENSES_FILE;
    await rm(tempDir, { force: true, recursive: true });
  }
});

test("POST accepts reviewed expenses and rejects invalid payloads", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "spendino-api-reviewed-"));
  process.env.SPENDINO_LOCAL_EXPENSES_FILE = join(tempDir, "expenses.json");
  clearGoogleEnv();

  try {
    const reviewedResponse = await POST(
      jsonRequest({
        expense: {
          amount: 18,
          category: "transport",
          date: "2026-05-17",
          description: "treno",
          rawInput: "18 treno",
          source: "text",
        },
      }),
    );
    const reviewedExpense = await reviewedResponse.json();

    assert.equal(reviewedResponse.status, 201);
    assert.equal(reviewedExpense.amount, 18);
    assert.equal(reviewedExpense.category, "transport");
    assert.equal(reviewedExpense.date, "2026-05-17");
    assert.equal(reviewedExpense.rawInput, "18 treno");

    const invalidResponse = await POST(jsonRequest({ rawInput: "" }));
    const invalidData = await invalidResponse.json();

    assert.equal(invalidResponse.status, 400);
    assert.equal(invalidData.error, "Inserisci una spesa");
  } finally {
    delete process.env.SPENDINO_LOCAL_EXPENSES_FILE;
    await rm(tempDir, { force: true, recursive: true });
  }
});

for (const { name, run } of tests) {
  await run();
  console.log(`ok - ${name}`);
}
