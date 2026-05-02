import { categorizeExpense } from "@/lib/categorizeExpense";
import { classifyExpenseWithGemini } from "@/lib/geminiClassifier";
import type { ExpenseCategory } from "@/types/expense";

export type ExpenseClassificationInput = {
  rawInput: string;
  description: string;
  amount: number;
  date: string;
};

export type ExpenseClassificationResult = {
  category: ExpenseCategory;
  provider: "rules" | "gemini";
  confidence?: number;
};

export interface ExpenseClassifier {
  classify(input: ExpenseClassificationInput): Promise<ExpenseClassificationResult>;
}

export async function classifyExpense(input: ExpenseClassificationInput): Promise<ExpenseClassificationResult> {
  const fallback = classifyExpenseWithRules(input);

  if (!isAiClassificationEnabled()) {
    return fallback;
  }

  try {
    const aiResult = await classifyExpenseWithGemini(input);

    if (aiResult && isAiClassificationCompareEnabled()) {
      logClassificationComparison(fallback, aiResult);
    }

    return aiResult ?? fallback;
  } catch {
    return fallback;
  }
}

export function classifyExpenseWithRules(input: ExpenseClassificationInput): ExpenseClassificationResult {
  return {
    category: categorizeExpense(input.description),
    provider: "rules",
  };
}

function isAiClassificationEnabled(): boolean {
  return (
    process.env.AI_CLASSIFICATION_ENABLED === "true" &&
    process.env.AI_PROVIDER === "gemini" &&
    Boolean(process.env.GEMINI_API_KEY)
  );
}

function isAiClassificationCompareEnabled(): boolean {
  return process.env.AI_CLASSIFICATION_COMPARE === "true";
}

function logClassificationComparison(
  rulesResult: ExpenseClassificationResult,
  aiResult: ExpenseClassificationResult,
): void {
  console.info("[Spendino AI comparison]", {
    rulesCategory: rulesResult.category,
    aiCategory: aiResult.category,
    aiConfidence: aiResult.confidence ?? null,
    matched: rulesResult.category === aiResult.category,
  });
}
