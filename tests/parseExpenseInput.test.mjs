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

const { parseExpenseInput } = await import("../src/lib/parseExpenseInput.ts");
const fixedNow = new Date("2026-05-01T12:00:00.000Z");
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

test("parses natural Italian input with amount, description, category and yesterday", () => {
  const expense = parseExpenseInput("ho pagato 18 euro per una pizza ieri sera", "text", fixedNow);

  assert.equal(expense.amount, 18);
  assert.equal(expense.description, "pizza");
  assert.equal(expense.category, "food");
  assert.equal(expense.date, "2026-04-30");
  assert.equal(expense.rawInput, "ho pagato 18 euro per una pizza ieri sera");
});

test("parses weekday with scorso", () => {
  const expense = parseExpenseInput("35 euro benzina lunedi scorso", "text", fixedNow);

  assert.equal(expense.amount, 35);
  assert.equal(expense.description, "benzina");
  assert.equal(expense.category, "transport");
  assert.equal(expense.date, "2026-04-27");
});

test("parses week and month natural dates", () => {
  const previousWeek = parseExpenseInput("50 supermercato la settimana scorsa", "text", fixedNow);
  const endOfMonth = parseExpenseInput("9.99 netflix a fine mese", "text", fixedNow);

  assert.equal(previousWeek.date, "2026-04-24");
  assert.equal(previousWeek.category, "groceries");
  assert.equal(endOfMonth.date, "2026-05-31");
  assert.equal(endOfMonth.category, "subscriptions");
});

test("keeps raw input and flags multiple amounts", () => {
  const expense = parseExpenseInput("ho pagato 18 euro e 2 euro mancia pizza", "text", fixedNow);

  assert.equal(expense.amount, 18);
  assert.equal(expense.description, "mancia pizza");
  assert.equal(expense.rawInput, "ho pagato 18 euro e 2 euro mancia pizza");
  assert.equal(expense.notes, "Input con importi multipli: e stato usato l'importo principale.");
});

test("parses voice-like transcript without punctuation", () => {
  const expense = parseExpenseInput("ho speso 12 euro caffe al bar ieri mattina", "voice", fixedNow);

  assert.equal(expense.amount, 12);
  assert.equal(expense.description, "caffe bar");
  assert.equal(expense.category, "food");
  assert.equal(expense.date, "2026-04-30");
  assert.equal(expense.source, "voice");
});

test("returns a helpful error when amount is missing", () => {
  assert.throws(
    () => parseExpenseInput("pizza ieri sera", "text", fixedNow),
    /Non ho trovato un importo/,
  );
});

for (const { name, run } of tests) {
  run();
  console.log(`ok - ${name}`);
}
