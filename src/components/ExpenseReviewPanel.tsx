"use client";

import { FormEvent, useState } from "react";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { EXPENSE_CATEGORIES, type Expense } from "@/types/expense";

type ExpenseReviewPanelProps = {
  expense: Expense;
  isSaving: boolean;
  reasons: string[];
  suggestedBy?: "gemini" | "rules";
  onCancel: () => void;
  onConfirm: (expense: Expense) => Promise<void>;
};

export function ExpenseReviewPanel({
  expense,
  isSaving,
  onCancel,
  onConfirm,
  reasons,
  suggestedBy = "rules",
}: ExpenseReviewPanelProps) {
  const [draft, setDraft] = useState(expense);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onConfirm({
      ...draft,
      amount: Number(draft.amount),
      description: draft.description.trim(),
      notes: buildReviewNotes(expense, draft),
      rawInput: expense.rawInput,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/85 p-3 shadow-sm"
    >
      <div className="mb-3">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-amber-950">Controlla spesa</h3>
        <p className="mt-1 text-xs font-bold text-amber-900">
          {reasons.length > 0 ? reasons.join(" - ") : "Parsing da confermare"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-600">
          Categoria suggerita da {suggestedBy === "gemini" ? "AI" : "regole locali"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-black uppercase text-slate-600">Importo</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(event) => setDraft((current) => ({ ...current, amount: Number(event.target.value) }))}
            className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:ring-4 focus:ring-amber-100"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-black uppercase text-slate-600">Data</span>
          <input
            type="date"
            value={draft.date}
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:ring-4 focus:ring-amber-100"
          />
        </label>
      </div>

      <label className="mt-3 block space-y-1">
        <span className="text-xs font-black uppercase text-slate-600">Descrizione</span>
        <input
          type="text"
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:ring-4 focus:ring-amber-100"
        />
      </label>

      <label className="mt-3 block space-y-1">
        <span className="text-xs font-black uppercase text-slate-600">Categoria</span>
        <select
          value={draft.category}
          onChange={(event) =>
            setDraft((current) => ({ ...current, category: event.target.value as Expense["category"] }))
          }
          className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:ring-4 focus:ring-amber-100"
        >
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_META[category].label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="h-11 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isSaving ? "Salvataggio..." : "Conferma"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

function buildReviewNotes(original: Expense, draft: Expense): string | undefined {
  const notes = original.notes ? [original.notes] : [];

  if (draft.category !== original.category) {
    notes.push("Categoria modificata manualmente.");
  }

  if (draft.description.trim() !== original.description) {
    notes.push("Descrizione modificata manualmente.");
  }

  if (draft.amount !== original.amount || draft.date !== original.date) {
    notes.push("Valori corretti manualmente.");
  }

  return notes.length > 0 ? notes.join(" ") : undefined;
}
