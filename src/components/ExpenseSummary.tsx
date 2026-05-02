import { isSameMonth, toIsoDate } from "@/lib/dates";
import type { Expense } from "@/types/expense";

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function ExpenseSummary({ expenses }: { expenses: Expense[] }) {
  const today = toIsoDate(new Date());
  const todayTotal = expenses
    .filter((expense) => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const monthTotal = expenses
    .filter((expense) => isSameMonth(expense.date))
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <section className="grid grid-cols-2 gap-3">
      <SummaryItem label="Oggi" value={currencyFormatter.format(todayTotal)} accent="from-cyan-300 to-teal-300" />
      <SummaryItem label="Mese" value={currencyFormatter.format(monthTotal)} accent="from-amber-300 to-rose-300" />
    </section>
  );
}

function SummaryItem({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black leading-none text-slate-950">{value}</p>
    </div>
  );
}
