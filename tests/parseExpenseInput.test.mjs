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

test("parses explicit Italian dates with month names", () => {
  const firstMay = parseExpenseInput("20€ pranzo primo maggio", "text", fixedNow);
  const numericDay = parseExpenseInput("12 pizza 1 maggio", "text", fixedNow);
  const explicitYear = parseExpenseInput("8 treno 15 novembre 2025", "text", fixedNow);
  const withDi = parseExpenseInput("5 caffe il primo di maggio", "text", fixedNow);

  assert.equal(firstMay.amount, 20);
  assert.equal(firstMay.description, "pranzo");
  assert.equal(firstMay.category, "food");
  assert.equal(firstMay.date, "2026-05-01");
  assert.equal(firstMay.notes, undefined);

  assert.equal(numericDay.amount, 12);
  assert.equal(numericDay.description, "pizza");
  assert.equal(numericDay.date, "2026-05-01");
  assert.equal(numericDay.notes, undefined);

  assert.equal(explicitYear.amount, 8);
  assert.equal(explicitYear.description, "treno");
  assert.equal(explicitYear.date, "2025-11-15");

  assert.equal(withDi.amount, 5);
  assert.equal(withDi.description, "caffe");
  assert.equal(withDi.date, "2026-05-01");
});

test("parses numeric explicit dates without treating date parts as amounts", () => {
  const slashDate = parseExpenseInput("20 pranzo 01/05/2025", "text", fixedNow);
  const dottedDate = parseExpenseInput("15 farmacia 1.5.26", "text", fixedNow);

  assert.equal(slashDate.amount, 20);
  assert.equal(slashDate.description, "pranzo");
  assert.equal(slashDate.date, "2025-05-01");
  assert.equal(slashDate.notes, undefined);

  assert.equal(dottedDate.amount, 15);
  assert.equal(dottedDate.description, "farmacia");
  assert.equal(dottedDate.date, "2026-05-01");
  assert.equal(dottedDate.notes, undefined);
});

test("parses richer relative date expressions", () => {
  const twoDaysAgo = parseExpenseInput("10 euro bar due giorni fa", "text", fixedNow);
  const numericDaysAgo = parseExpenseInput("11 euro taxi 3 giorni fa", "text", fixedNow);
  const otherYesterday = parseExpenseInput("7 euro gelato l'altro ieri", "text", fixedNow);
  const lastMonth = parseExpenseInput("40 euro internet mese scorso", "text", fixedNow);
  const nextWeek = parseExpenseInput("25 euro regalo settimana prossima", "text", fixedNow);
  const weekend = parseExpenseInput("18 euro cinema questo weekend", "text", fixedNow);

  assert.equal(twoDaysAgo.date, "2026-04-29");
  assert.equal(twoDaysAgo.description, "bar");
  assert.equal(twoDaysAgo.notes, undefined);
  assert.equal(numericDaysAgo.date, "2026-04-28");
  assert.equal(numericDaysAgo.description, "taxi");
  assert.equal(numericDaysAgo.notes, undefined);
  assert.equal(otherYesterday.date, "2026-04-29");
  assert.equal(lastMonth.date, "2026-04-01");
  assert.equal(nextWeek.date, "2026-05-08");
  assert.equal(weekend.date, "2026-05-02");
});

test("parses spoken and dirty amounts", () => {
  const spoken = parseExpenseInput("dodici euro pranzo", "voice", fixedNow);
  const spokenCents = parseExpenseInput("dodici euro e cinquanta bar", "voice", fixedNow);
  const numericCents = parseExpenseInput("12 euro e 50 centesimi caffe", "voice", fixedNow);
  const spacedCents = parseExpenseInput("12 50 pranzo", "voice", fixedNow);
  const articleBeforeDescription = parseExpenseInput("un panino 5 euro", "voice", fixedNow);

  assert.equal(spoken.amount, 12);
  assert.equal(spoken.description, "pranzo");
  assert.equal(spoken.source, "voice");
  assert.equal(spokenCents.amount, 12.5);
  assert.equal(spokenCents.description, "bar");
  assert.equal(numericCents.amount, 12.5);
  assert.equal(numericCents.description, "caffe");
  assert.equal(spacedCents.amount, 12.5);
  assert.equal(spacedCents.description, "pranzo");
  assert.equal(articleBeforeDescription.amount, 5);
  assert.equal(articleBeforeDescription.description, "panino");
});

test("flags high amounts, far future dates and multiple dates for review", () => {
  const highAmount = parseExpenseInput("1200 euro computer", "text", fixedNow);
  const farFuture = parseExpenseInput("20 euro treno 1 gennaio 2027", "text", fixedNow);
  const multipleDates = parseExpenseInput("15 euro pizza ieri primo maggio", "text", fixedNow);

  assert.match(highAmount.notes, /Importo elevato/);
  assert.match(farFuture.notes, /Data futura lontana/);
  assert.match(multipleDates.notes, /date multiple/);
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
