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

const {
  GENERAL_SUMMARY_HEADERS,
  buildArchiveSheetName,
  buildGeneralSummaryRows,
  generalSummaryRowsToSheetValues,
  getExpenseTargetSheetName,
  isArchiveSheetName,
} = await import("../src/lib/expenseArchive.ts");
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function makeExpense(id, amount, date) {
  return {
    id,
    amount,
    currency: "EUR",
    description: id,
    category: "other",
    date,
    rawInput: `${amount} ${id}`,
    source: "text",
    createdAt: `${date}T10:00:00.000Z`,
  };
}

test("routes past expenses to yearly archive sheets and current or future expenses to Expenses", () => {
  const now = new Date("2026-05-17T12:00:00.000Z");

  assert.equal(buildArchiveSheetName(2025), "Archive_Detail_2025");
  assert.equal(isArchiveSheetName("Archive_Detail_2025"), true);
  assert.equal(isArchiveSheetName("Archive_Detail_test"), false);
  assert.equal(getExpenseTargetSheetName("2025-11-10", "Expenses", now), "Archive_Detail_2025");
  assert.equal(getExpenseTargetSheetName("2026-05-17", "Expenses", now), "Expenses");
  assert.equal(getExpenseTargetSheetName("2027-01-02", "Expenses", now), "Expenses");
});

test("builds yearly monthly summary rows for Generale", () => {
  const rows = buildGeneralSummaryRows([
    makeExpense("jan_2025", 10, "2025-01-05"),
    makeExpense("jan_2025_b", 2.235, "2025-01-10"),
    makeExpense("mar_2025", 5, "2025-03-01"),
    makeExpense("may_2026", 20, "2026-05-17"),
  ]);
  const values = generalSummaryRowsToSheetValues(rows);

  assert.deepEqual(values[0], [...GENERAL_SUMMARY_HEADERS]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].year, 2025);
  assert.equal(rows[0].months[0], 12.24);
  assert.equal(rows[0].months[2], 5);
  assert.equal(rows[0].total, 17.24);
  assert.equal(rows[1].year, 2026);
  assert.equal(rows[1].months[4], 20);
  assert.equal(rows[1].total, 20);
});

for (const { name, run } of tests) {
  run();
  console.log(`ok - ${name}`);
}
