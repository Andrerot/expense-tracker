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

const { DEFAULT_EXPENSE_FILTERS, filterExpenses, hasActiveExpenseFilters } = await import(
  "../src/lib/filterExpenses.ts"
);

const tests = [];
const now = new Date("2026-05-06T12:00:00.000Z");
const expenses = [
  makeExpense("food_today", "food", "text", "2026-05-06"),
  makeExpense("transport_week", "transport", "voice", "2026-05-04"),
  makeExpense("health_month", "health", "text", "2026-05-01"),
  makeExpense("shopping_old", "shopping", "voice", "2026-04-20"),
];

function test(name, run) {
  tests.push({ name, run });
}

function makeExpense(id, category, source, date) {
  return {
    id,
    amount: 10,
    currency: "EUR",
    description: id === "food_today" ? "Caffe al bar" : id,
    category,
    date,
    rawInput: id === "health_month" ? "30 euro farmacia" : id,
    source,
    createdAt: `${date}T10:00:00.000Z`,
    notes: id === "shopping_old" ? "Acquisto regalo online" : undefined,
  };
}

test("detects active filters", () => {
  assert.equal(hasActiveExpenseFilters(DEFAULT_EXPENSE_FILTERS), false);
  assert.equal(hasActiveExpenseFilters({ ...DEFAULT_EXPENSE_FILTERS, source: "voice" }), true);
});

test("filters by category and source", () => {
  const result = filterExpenses(
    expenses,
    {
      ...DEFAULT_EXPENSE_FILTERS,
      category: "transport",
      source: "voice",
    },
    now,
  );

  assert.deepEqual(result.map((expense) => expense.id), ["transport_week"]);
});

test("filters by quick periods", () => {
  assert.deepEqual(
    filterExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, period: "today" }, now).map(
      (expense) => expense.id,
    ),
    ["food_today"],
  );
  assert.deepEqual(
    filterExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, period: "week" }, now).map(
      (expense) => expense.id,
    ),
    ["food_today", "transport_week"],
  );
  assert.deepEqual(
    filterExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, period: "month" }, now).map(
      (expense) => expense.id,
    ),
    ["food_today", "transport_week", "health_month"],
  );
});

test("filters by custom range", () => {
  const result = filterExpenses(
    expenses,
    {
      ...DEFAULT_EXPENSE_FILTERS,
      customFrom: "2026-04-25",
      customTo: "2026-05-04",
      period: "custom",
    },
    now,
  );

  assert.deepEqual(result.map((expense) => expense.id), ["transport_week", "health_month"]);
});

test("filters by text query across description, raw input and notes", () => {
  assert.deepEqual(
    filterExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, query: "caffe" }, now).map(
      (expense) => expense.id,
    ),
    ["food_today"],
  );
  assert.deepEqual(
    filterExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, query: "farmacia" }, now).map(
      (expense) => expense.id,
    ),
    ["health_month"],
  );
  assert.deepEqual(
    filterExpenses(expenses, { ...DEFAULT_EXPENSE_FILTERS, query: "REGALO" }, now).map(
      (expense) => expense.id,
    ),
    ["shopping_old"],
  );
});

for (const { name, run } of tests) {
  await run();
  console.log(`ok - ${name}`);
}
