import type { Expense } from "@/types/expense";
import { CATEGORY_META } from "@/lib/categoryMeta";

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

type ExpenseListProps = {
  deletingExpenseId?: string | null;
  emptyMessage?: string;
  expenses: Expense[];
  groupByDate?: boolean;
  onDeleteExpense?: (expense: Expense) => void;
  onEditExpense?: (expense: Expense) => void;
};

export function ExpenseList({
  deletingExpenseId,
  emptyMessage = "Nessuna spesa registrata.",
  expenses,
  groupByDate = false,
  onDeleteExpense,
  onEditExpense,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm font-bold text-slate-600 shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  if (groupByDate) {
    const groups = groupExpensesByDate(expenses);

    return (
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.date} className="space-y-2">
            <div className="sticky top-2 z-10 flex items-center justify-between rounded-full border border-white/70 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
              <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                {formatLongDate(group.date)}
              </h3>
              <p className="text-xs font-black text-slate-950">{currencyFormatter.format(group.total)}</p>
            </div>
            <ExpenseRows
              deletingExpenseId={deletingExpenseId}
              expenses={group.expenses}
              onDeleteExpense={onDeleteExpense}
              onEditExpense={onEditExpense}
            />
          </section>
        ))}
      </div>
    );
  }

  return (
    <ExpenseRows
      deletingExpenseId={deletingExpenseId}
      expenses={expenses}
      onDeleteExpense={onDeleteExpense}
      onEditExpense={onEditExpense}
    />
  );
}

function ExpenseRows({
  deletingExpenseId,
  expenses,
  onDeleteExpense,
  onEditExpense,
}: Pick<ExpenseListProps, "deletingExpenseId" | "expenses" | "onDeleteExpense" | "onEditExpense">) {
  return (
    <div className="space-y-2">
      {expenses.map((expense) => {
        const meta = CATEGORY_META[expense.category];
        const isDeleting = deletingExpenseId === expense.id;

        return (
          <article
            key={expense.id}
            className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5"
          >
            <div className="flex items-center gap-3">
              <div
                className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xs font-black ring-1 ${meta.tone}`}
                aria-hidden="true"
                title={meta.description}
              >
                {meta.marker}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-black text-slate-950">{expense.description}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                  <span>{formatDate(expense.date)}</span>
                  <span className={`rounded-full px-2 py-1 ring-1 ${meta.tone}`} title={meta.description}>
                    {meta.label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                    {expense.source === "voice" ? "Voce" : "Testo"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-right text-lg font-black text-slate-950">
                  {currencyFormatter.format(expense.amount)}
                </p>
                {onEditExpense ? (
                  <button
                    type="button"
                    onClick={() => onEditExpense(expense)}
                    disabled={isDeleting}
                    aria-label={`Modifica ${expense.description}`}
                    title="Modifica spesa"
                    className="grid size-9 place-items-center rounded-xl border border-cyan-100 bg-cyan-50 text-xs font-black text-cyan-800 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <svg
                      aria-hidden="true"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.3"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                ) : null}
                {onDeleteExpense ? (
                  <button
                    type="button"
                    onClick={() => onDeleteExpense(expense)}
                    disabled={isDeleting}
                    aria-label={`Cancella ${expense.description}`}
                    title="Cancella spesa"
                    className="grid size-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-sm font-black text-red-700 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {isDeleting ? "..." : "X"}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function groupExpensesByDate(expenses: Expense[]): Array<{ date: string; expenses: Expense[]; total: number }> {
  const groups = new Map<string, { date: string; expenses: Expense[]; total: number }>();

  for (const expense of expenses) {
    const group = groups.get(expense.date) ?? { date: expense.date, expenses: [], total: 0 };
    group.expenses.push(expense);
    group.total += expense.amount;
    groups.set(expense.date, group);
  }

  return Array.from(groups.values());
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}
