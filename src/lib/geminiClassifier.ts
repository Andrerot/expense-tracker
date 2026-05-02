import type { ExpenseClassificationInput, ExpenseClassificationResult } from "@/lib/classifyExpense";
import { isExpenseCategory } from "@/types/expense";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_TIMEOUT_MS = 5000;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiClassificationPayload = {
  category?: unknown;
  confidence?: unknown;
};

export async function classifyExpenseWithGemini(
  input: ExpenseClassificationInput,
): Promise<ExpenseClassificationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = process.env.AI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildClassificationPrompt(input),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "food",
                "groceries",
                "transport",
                "home",
                "health",
                "entertainment",
                "shopping",
                "subscriptions",
                "travel",
                "other",
              ],
            },
            confidence: {
              type: "number",
            },
          },
          required: ["category"],
        },
      },
    }),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return null;
  }

  return parseGeminiClassification(text);
}

function buildClassificationPrompt(input: ExpenseClassificationInput): string {
  return [
    "Classifica una singola spesa personale italiana.",
    "Rispondi solo con JSON valido.",
    "Usa esclusivamente una categoria tra: food, groceries, transport, home, health, entertainment, shopping, subscriptions, travel, other.",
    "Non inventare nuove categorie.",
    "",
    `Raw input: ${input.rawInput}`,
    `Descrizione normalizzata: ${input.description}`,
    `Importo EUR: ${input.amount}`,
    `Data: ${input.date}`,
  ].join("\n");
}

function parseGeminiClassification(text: string): ExpenseClassificationResult | null {
  let parsed: GeminiClassificationPayload;

  try {
    parsed = JSON.parse(text) as GeminiClassificationPayload;
  } catch {
    return null;
  }

  if (typeof parsed.category !== "string" || !isExpenseCategory(parsed.category)) {
    return null;
  }

  const confidence = typeof parsed.confidence === "number" ? clampConfidence(parsed.confidence) : undefined;

  return {
    category: parsed.category,
    provider: "gemini",
    confidence,
  };
}

function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.min(1, Math.max(0, confidence));
}
