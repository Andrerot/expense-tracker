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

const { CATEGORY_META } = await import("../src/lib/categoryMeta.ts");
const { EXPENSE_CATEGORIES } = await import("../src/types/expense.ts");
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

test("every expense category has complete display metadata", () => {
  for (const category of EXPENSE_CATEGORIES) {
    const meta = CATEGORY_META[category];

    assert.ok(meta, `${category} metadata missing`);
    assert.ok(meta.description.length > 10, `${category} description too short`);
    assert.ok(meta.label.length > 0, `${category} label missing`);
    assert.match(meta.marker, /^[A-Z]{2}$/, `${category} marker must be two uppercase letters`);
    assert.ok(meta.tone.includes("bg-"), `${category} tone missing background class`);
  }
});

test("other category is available as explicit fallback", () => {
  assert.equal(CATEGORY_META.other.label, "Altro");
  assert.match(CATEGORY_META.other.description, /Fallback/);
});

for (const { name, run } of tests) {
  await run();
  console.log(`ok - ${name}`);
}
