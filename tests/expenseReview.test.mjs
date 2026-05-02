import { strict as assert } from "node:assert";
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

const { getExpenseReview } = await import("../src/lib/expenseReview.ts");
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function makeExpense(overrides) {
  return {
    id: "exp_test",
    amount: 10,
    currency: "EUR",
    description: "pizza",
    category: "food",
    date: "2026-05-01",
    rawInput: "10 pizza",
    source: "text",
    createdAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

test("does not require review for clear expenses", () => {
  const review = getExpenseReview(makeExpense());

  assert.equal(review.required, false);
  assert.deepEqual(review.reasons, []);
});

test("requires review for uncertain category, weak description and multiple amounts", () => {
  const review = getExpenseReview(
    makeExpense({
      category: "other",
      description: "spesa",
      notes: "Input con importi multipli: e stato usato l'importo principale.",
    }),
  );

  assert.equal(review.required, true);
  assert.deepEqual(review.reasons, [
    "Categoria incerta",
    "Descrizione poco chiara",
    "Importi multipli rilevati",
  ]);
});

for (const { name, run } of tests) {
  await run();
  console.log(`ok - ${name}`);
}
