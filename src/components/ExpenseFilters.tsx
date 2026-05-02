import { CATEGORY_META } from "@/lib/categoryMeta";
import type { ExpenseFilters as ExpenseFiltersState } from "@/lib/filterExpenses";
import { DEFAULT_EXPENSE_FILTERS, hasActiveExpenseFilters } from "@/lib/filterExpenses";
import { EXPENSE_CATEGORIES } from "@/types/expense";

type ExpenseFiltersProps = {
  filters: ExpenseFiltersState;
  resultCount: number;
  totalCount: number;
  onChange: (filters: ExpenseFiltersState) => void;
};

export function ExpenseFilters({ filters, resultCount, totalCount, onChange }: ExpenseFiltersProps) {
  const hasActiveFilters = hasActiveExpenseFilters(filters);

  function updateFilter(nextFilters: Partial<ExpenseFiltersState>) {
    onChange({ ...filters, ...nextFilters });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_16px_44px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">Filtri</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {resultCount} di {totalCount} spese
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_EXPENSE_FILTERS)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition active:scale-[0.98]"
          >
            Reset
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Cerca</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilter({ query: event.target.value })}
            placeholder="Descrizione o testo originale"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Periodo</legend>
          <div className="grid grid-cols-4 gap-2">
            {[
              ["all", "Tutto"],
              ["today", "Oggi"],
              ["week", "Settimana"],
              ["month", "Mese"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updateFilter({ period: value as ExpenseFiltersState["period"] })}
                className={`h-10 rounded-xl px-2 text-xs font-black transition active:scale-[0.98] ${
                  filters.period === value
                    ? "bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.20)]"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateFilter({ period: filters.period === "custom" ? "all" : "custom" })}
            className={`h-10 w-full rounded-xl border px-3 text-xs font-black transition active:scale-[0.98] ${
              filters.period === "custom"
                ? "border-cyan-300 bg-cyan-50 text-cyan-950"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Periodo personalizzato
          </button>
        </fieldset>

        {filters.period === "custom" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-black uppercase text-slate-500">Da</span>
              <input
                type="date"
                value={filters.customFrom}
                onChange={(event) => updateFilter({ customFrom: event.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-black uppercase text-slate-500">A</span>
              <input
                type="date"
                value={filters.customTo}
                onChange={(event) => updateFilter({ customTo: event.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
          </div>
        ) : null}

        <fieldset className="min-w-0 space-y-2">
          <legend className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Categoria</legend>
          <div className="max-w-full overflow-hidden">
            <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
              <button
                type="button"
                onClick={() => updateFilter({ category: "all" })}
                className={`h-10 shrink-0 rounded-xl px-3 text-xs font-black transition active:scale-[0.98] ${
                  filters.category === "all"
                    ? "bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.20)]"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                Tutte
              </button>
              {EXPENSE_CATEGORIES.map((category) => {
                const meta = CATEGORY_META[category];
                const isSelected = filters.category === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => updateFilter({ category })}
                    className={`h-10 shrink-0 rounded-xl px-3 text-xs font-black ring-1 transition active:scale-[0.98] ${
                      isSelected ? meta.tone : "bg-white text-slate-700 ring-slate-200"
                    }`}
                    title={meta.description}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Origine</span>
            <select
              value={filters.source}
              onChange={(event) => updateFilter({ source: event.target.value as ExpenseFiltersState["source"] })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="all">Tutte</option>
              <option value="text">Testo</option>
              <option value="voice">Voce</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
