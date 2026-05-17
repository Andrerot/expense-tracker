import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        url: pathToFileURL(resolve(process.cwd(), "src", `${specifier.slice(2)}.ts`)).href,
        shortCircuit: true,
      };
    }

    return nextResolve(specifier, context);
  },
});

const { appendLocalExpense, deleteLocalExpense, getLocalExpense, listLocalExpenses, updateLocalExpense } = await import(
  "../src/lib/localExpenseStore.ts"
);

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function makeExpense(id, description, createdAt) {
  return {
    id,
    amount: 10,
    currency: "EUR",
    description,
    category: "other",
    date: "2026-05-01",
    rawInput: `${10} ${description}`,
    source: "text",
    createdAt,
  };
}

test("deleteLocalExpense removes one expense and keeps the others", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "spendino-store-"));
  process.env.SPENDINO_LOCAL_EXPENSES_FILE = join(tempDir, "expenses.json");

  try {
    await appendLocalExpense(makeExpense("exp_1", "prima", "2026-05-01T10:00:00.000Z"));
    await appendLocalExpense(makeExpense("exp_2", "seconda", "2026-05-01T11:00:00.000Z"));

    const existingExpense = await getLocalExpense("exp_1");
    assert.ok(existingExpense);
    assert.equal(existingExpense.description, "prima");

    const updatedExpense = await updateLocalExpense({
      ...existingExpense,
      amount: 12,
      description: "prima aggiornata",
    });
    assert.equal(updatedExpense.description, "prima aggiornata");
    assert.equal(updatedExpense.amount, 12);
    assert.equal(await updateLocalExpense(makeExpense("missing", "missing", "2026-05-01T12:00:00.000Z")), null);

    assert.equal(await deleteLocalExpense("exp_1"), true);
    assert.equal(await deleteLocalExpense("missing"), false);

    const expenses = await listLocalExpenses();

    assert.equal(expenses.length, 1);
    assert.equal(expenses[0].id, "exp_2");
  } finally {
    delete process.env.SPENDINO_LOCAL_EXPENSES_FILE;
    await rm(tempDir, { force: true, recursive: true });
  }
});

for (const { name, run } of tests) {
  await run();
  console.log(`ok - ${name}`);
}
