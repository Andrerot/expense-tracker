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

const { classifyExpense, classifyExpenseWithRules } = await import("../src/lib/classifyExpense.ts");
const tests = [];
const originalFetch = globalThis.fetch;
const originalConsoleInfo = console.info;

function test(name, run) {
  tests.push({ name, run });
}

function resetAiEnv() {
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_PROVIDER;
  delete process.env.AI_MODEL;
  delete process.env.AI_CLASSIFICATION_ENABLED;
  delete process.env.AI_CLASSIFICATION_COMPARE;
}

const pizzaInput = {
  rawInput: "18 euro pizza ieri sera",
  description: "pizza",
  amount: 18,
  date: "2026-04-30",
};

test("rule classifier returns a valid local category", () => {
  const result = classifyExpenseWithRules(pizzaInput);

  assert.equal(result.category, "food");
  assert.equal(result.provider, "rules");
});

test("rule classifier recognizes expanded everyday keywords", () => {
  assert.equal(classifyExpenseWithRules({ ...pizzaInput, description: "rata mutuo" }).category, "home");
  assert.equal(classifyExpenseWithRules({ ...pizzaInput, description: "manga kagura" }).category, "entertainment");
  assert.equal(classifyExpenseWithRules({ ...pizzaInput, description: "drink pub" }).category, "food");
  assert.equal(classifyExpenseWithRules({ ...pizzaInput, description: "meccanico gomme" }).category, "transport");
  assert.equal(classifyExpenseWithRules({ ...pizzaInput, description: "regalo fratello" }).category, "shopping");
});

test("main classifier falls back to rules when AI is disabled", async () => {
  resetAiEnv();
  process.env.AI_CLASSIFICATION_ENABLED = "false";

  const result = await classifyExpense(pizzaInput);

  assert.equal(result.category, "food");
  assert.equal(result.provider, "rules");
});

test("main classifier falls back to rules when AI key is missing", async () => {
  resetAiEnv();
  process.env.AI_CLASSIFICATION_ENABLED = "true";
  process.env.AI_PROVIDER = "gemini";

  const result = await classifyExpense({
    rawInput: "8 euro treno",
    description: "treno",
    amount: 8,
    date: "2026-05-01",
  });

  assert.equal(result.category, "transport");
  assert.equal(result.provider, "rules");
});

test("main classifier uses Gemini category when enabled and response is valid", async () => {
  resetAiEnv();
  process.env.AI_CLASSIFICATION_ENABLED = "true";
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-key";
  process.env.AI_MODEL = "gemini-2.5-flash-lite";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({ category: "shopping", confidence: 0.82 }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const result = await classifyExpense({
    rawInput: "12 euro apple",
    description: "apple",
    amount: 12,
    date: "2026-05-01",
  });

  assert.equal(result.category, "shopping");
  assert.equal(result.provider, "gemini");
  assert.equal(result.confidence, 0.82);
});

test("main classifier falls back when Gemini returns an invalid category", async () => {
  resetAiEnv();
  process.env.AI_CLASSIFICATION_ENABLED = "true";
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({ category: "invalid", confidence: 0.9 }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const result = await classifyExpense({
    rawInput: "30 farmacia",
    description: "farmacia",
    amount: 30,
    date: "2026-05-01",
  });

  assert.equal(result.category, "health");
  assert.equal(result.provider, "rules");
});

test("comparison mode logs rule and AI categories without changing result", async () => {
  resetAiEnv();
  process.env.AI_CLASSIFICATION_ENABLED = "true";
  process.env.AI_CLASSIFICATION_COMPARE = "true";
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-key";
  const logs = [];
  console.info = (...args) => logs.push(args);
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({ category: "transport", confidence: 0.77 }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const result = await classifyExpense({
    rawInput: "8 euro treno",
    description: "treno",
    amount: 8,
    date: "2026-05-01",
  });

  assert.equal(result.category, "transport");
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "[Spendino AI comparison]");
  assert.deepEqual(logs[0][1], {
    rulesCategory: "transport",
    aiCategory: "transport",
    aiConfidence: 0.77,
    matched: true,
  });
});

try {
  for (const { name, run } of tests) {
    await run();
    console.log(`ok - ${name}`);
  }
} finally {
  resetAiEnv();
  globalThis.fetch = originalFetch;
  console.info = originalConsoleInfo;
}
