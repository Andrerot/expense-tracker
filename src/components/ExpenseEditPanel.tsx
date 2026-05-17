"use client";

import { type FormEvent, useState } from "react";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { EXPENSE_CATEGORIES, type Expense } from "@/types/expense";

type ExpenseEditPanelProps = {
  expense: Expense;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (expense: Expense) => Promise<void>;
};

export function ExpenseEditPanel({ expense, isSaving, onCancel, onSave }: ExpenseEditPanelProps) {
  const [draft, setDraft] = useState(expense);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave({
      ...expense,
      amount: Number(draft.amount),
      category: draft.category,
      date: draft.date,
      description: draft.description.trim(),
      notes: buildEditNotes(expense, draft),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-2xl border border-cyan-200 bg-white/85 p-3 shadow-[0_16px_44px_rgba(15,23,42,0.08)] ring-1 ring-cyan-100/80 backdrop-blur"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-cyan-950">Modifica spesa</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">Aggiorna solo i dati visibili nello storico.</p>
        </div>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-900 ring-1 ring-cyan-200">
          {expense.source === "voice" ? "Voce" : "Testo"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-black uppercase text-slate-600">Importo</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={draft.amount}
            onChange={(event) => setDraft((current) => ({ ...current, amount: Number(event.target.value) }))}
            className="h-11 w-full rounded-xl border border-cyan-100 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-black uppercase text-slate-600">Data</span>
          <input
            type="date"
            value={draft.date}
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            className="h-11 w-full rounded-xl border border-cyan-100 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />
        </label>
      </div>

      <label className="mt-3 block space-y-1">
        <span className="text-xs font-black uppercase text-slate-600">Descrizione</span>
        <input
          type="text"
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          className="h-11 w-full rounded-xl border border-cyan-100 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
        />
      </label>

      <label className="mt-3 block space-y-1">
        <span className="text-xs font-black uppercase text-slate-600">Categoria</span>
        <select
          value={draft.category}
          onChange={(event) =>
            setDraft((current) => ({ ...current, category: event.target.value as Expense["category"] }))
          }
          className="h-11 w-full rounded-xl border border-cyan-100 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
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
          className="h-11 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isSaving ? "Salvataggio..." : "Salva modifiche"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

function buildEditNotes(original: Expense, draft: Expense): string | undefined {
  const notes = original.notes ? [original.notes] : [];
  const wasEdited =
    draft.amount !== original.amount ||
    draft.category !== original.category ||
    draft.date !== original.date ||
    draft.description.trim() !== original.description;

  if (wasEdited && !notes.some((note) => note.includes("Spesa modificata manualmente."))) {
    notes.push("Spesa modificata manualmente.");
  }

  return notes.length > 0 ? notes.join(" ") : undefined;
}
