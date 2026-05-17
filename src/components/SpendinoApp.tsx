"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ExpenseInput } from "@/components/ExpenseInput";
import { ExpenseFilters } from "@/components/ExpenseFilters";
import { ExpenseEditPanel } from "@/components/ExpenseEditPanel";
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseReviewPanel } from "@/components/ExpenseReviewPanel";
import { ExpenseSummary } from "@/components/ExpenseSummary";
import { DEFAULT_EXPENSE_FILTERS, filterExpenses, hasActiveExpenseFilters } from "@/lib/filterExpenses";
import type { ExpenseFilters as ExpenseFiltersState } from "@/lib/filterExpenses";
import type { Expense, ExpenseSource } from "@/types/expense";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

type AppTab = "add" | "history" | "settings";
type AuthStatus = "checking" | "locked" | "unlocked";

type ExpensePreviewResponse = {
  classificationProvider?: "gemini" | "rules";
  expense?: Expense;
  error?: string;
  review?: {
    required: boolean;
    reasons: string[];
  };
};

type StorageDiagnostics = {
  archiveSheetCount?: number;
  archiveSheetNames?: string[];
  checkedAt?: string;
  error?: string;
  generatedSpreadsheetId?: string;
  mode?: "google-sheets" | "local";
  operationalSheetReady?: boolean;
  ready?: boolean;
  shareWithEmailConfigured?: boolean;
  sheetName?: string;
  summarySheetName?: string;
  summarySheetReady?: boolean;
  spreadsheetId?: string;
  spreadsheetIdConfigured?: boolean;
  spreadsheetTitle?: string;
};

type GeneralSummaryResponse = {
  checkedAt?: string;
  error?: string;
  expenseCount?: number;
  mode?: "google-sheets" | "local";
  sheetName?: string;
  yearCount?: number;
};

export function SpendinoApp() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("add");
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ExpenseFiltersState>(DEFAULT_EXPENSE_FILTERS);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [historyFeedback, setHistoryFeedback] = useState<Feedback>(null);
  const [pendingReview, setPendingReview] = useState<{
    expense: Expense;
    reasons: string[];
    suggestedBy: "gemini" | "rules";
  } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const filteredExpenses = filterExpenses(expenses, filters);
  const hasActiveFilters = hasActiveExpenseFilters(filters);
  const recentExpenses = expenses.slice(0, 3);
  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthStatus() {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        const data = (await response.json()) as { unlocked?: boolean };

        if (isMounted) {
          setAuthStatus(data.unlocked ? "unlocked" : "locked");
        }
      } catch {
        if (isMounted) {
          setAuthStatus("locked");
        }
      }
    }

    checkAuthStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "unlocked") {
      return;
    }

    let isMounted = true;

    async function loadExpenses() {
      try {
        const loadedExpenses = await readExpensesFromApi();
        if (isMounted) {
          setExpenses(loadedExpenses);
        }
      } catch (error) {
        if (isMounted) {
          setFeedback({
            tone: "error",
            message: error instanceof Error ? error.message : "Errore inatteso",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadExpenses();

    return () => {
      isMounted = false;
    };
  }, [authStatus]);

  async function readExpensesFromApi(): Promise<Expense[]> {
    const response = await fetch("/api/expenses", { cache: "no-store" });
    const data = (await response.json()) as { expenses?: Expense[]; error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Non sono riuscito a leggere le spese");
    }

    return data.expenses ?? [];
  }

  async function handleSubmit(rawInput: string, source: ExpenseSource) {
    setIsSubmitting(true);
    setFeedback(null);
    setPendingReview(null);

    try {
      if (source === "text") {
        const preview = await previewExpense(rawInput, source);

        if (preview.review?.required && preview.expense) {
          setPendingReview({
            expense: preview.expense,
            reasons: preview.review.reasons,
            suggestedBy: preview.classificationProvider ?? "rules",
          });
          setFeedback({ tone: "error", message: "Controlla i dati prima di salvare" });
          return;
        }

        if (preview.expense) {
          await saveReviewedExpense(preview.expense);
          return;
        }
      }

      await saveRawExpense(rawInput, source);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Errore inatteso",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function previewExpense(rawInput: string, source: ExpenseSource): Promise<ExpensePreviewResponse> {
    const response = await fetch("/api/expenses/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawInput, source }),
    });
    const data = (await response.json()) as ExpensePreviewResponse;

    if (!response.ok || data.error) {
      throw new Error(data.error ?? "Non sono riuscito a interpretare la spesa");
    }

    return data;
  }

  async function saveRawExpense(rawInput: string, source: ExpenseSource) {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawInput, source }),
    });
    const data = (await response.json()) as Expense | { error?: string };

    if (!response.ok || isErrorResponse(data)) {
      throw new Error("error" in data ? data.error : "Non sono riuscito a salvare la spesa");
    }

    setExpenses((current) => [data, ...current]);
    setFeedback({ tone: "success", message: "Spesa aggiunta" });
  }

  async function saveReviewedExpense(expense: Expense) {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expense }),
    });
    const data = (await response.json()) as Expense | { error?: string };

    if (!response.ok || isErrorResponse(data)) {
      throw new Error("error" in data ? data.error : "Non sono riuscito a salvare la spesa");
    }

    setExpenses((current) => [data, ...current]);
    setPendingReview(null);
    setFeedback({ tone: "success", message: "Spesa aggiunta" });
  }

  async function handleConfirmReview(expense: Expense) {
    setIsSavingReview(true);
    setFeedback(null);

    try {
      await saveReviewedExpense(expense);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Errore inatteso",
      });
    } finally {
      setIsSavingReview(false);
    }
  }

  async function handleDeleteExpense(expense: Expense) {
    const confirmed = window.confirm(`Cancellare "${expense.description}" da Spendino?`);

    if (!confirmed) {
      return;
    }

    setDeletingExpenseId(expense.id);
    setHistoryFeedback(null);

    try {
      const response = await fetch(`/api/expenses/${encodeURIComponent(expense.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { deleted?: boolean; error?: string };

      if (!response.ok || !data.deleted) {
        throw new Error(data.error ?? "Non sono riuscito a cancellare la spesa");
      }

      setExpenses((current) => current.filter((currentExpense) => currentExpense.id !== expense.id));
      setHistoryFeedback({ tone: "success", message: "Spesa cancellata" });
    } catch (error) {
      setHistoryFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Errore inatteso",
      });
    } finally {
      setDeletingExpenseId(null);
    }
  }

  async function handleRefreshExpenses() {
    setIsRefreshing(true);
    setHistoryFeedback(null);
    setEditingExpense(null);

    try {
      const loadedExpenses = await readExpensesFromApi();
      setExpenses(loadedExpenses);
      setHistoryFeedback({ tone: "success", message: "Storico aggiornato" });
    } catch (error) {
      setHistoryFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Non sono riuscito ad aggiornare lo storico",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSaveExpenseEdit(expense: Expense) {
    setIsSavingEdit(true);
    setHistoryFeedback(null);

    try {
      const response = await fetch(`/api/expenses/${encodeURIComponent(expense.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          description: expense.description,
          notes: expense.notes,
        }),
      });
      const data = (await response.json()) as Expense | { error?: string };

      if (!response.ok || isErrorResponse(data)) {
        throw new Error("error" in data ? data.error : "Non sono riuscito a modificare la spesa");
      }

      setExpenses((current) =>
        current.map((currentExpense) => (currentExpense.id === data.id ? data : currentExpense)),
      );
      setEditingExpense(null);
      setHistoryFeedback({ tone: "success", message: "Spesa modificata" });
    } catch (error) {
      setHistoryFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Non sono riuscito a modificare la spesa",
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleLockApp() {
    await fetch("/api/auth/lock", { method: "POST" }).catch(() => undefined);
    window.localStorage.removeItem("spendino-unlocked-at");
    setExpenses([]);
    setPendingReview(null);
    setEditingExpense(null);
    setFeedback(null);
    setHistoryFeedback(null);
    setAuthStatus("locked");
    setActiveTab("add");
  }

  if (authStatus === "checking") {
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-4 py-[max(22px,env(safe-area-inset-top))]">
        <div className="w-full rounded-[28px] border border-white/70 bg-white/70 p-5 text-center shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-800">Spendino</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Controllo accesso</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">Preparo la tua app personale.</p>
        </div>
      </main>
    );
  }

  if (authStatus === "locked") {
    return <PinUnlockScreen onUnlocked={() => setAuthStatus("unlocked")} />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[max(22px,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-800">PWA spese</p>
          <h1 className="mt-1 text-4xl font-black leading-none text-slate-950">Spendino</h1>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/70 bg-slate-950 text-sm font-black text-cyan-200 shadow-[0_14px_35px_rgba(15,23,42,0.25)]">
          SP
        </div>
      </header>

      {activeTab === "add" ? (
        <div className="flex flex-1 flex-col">
          <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/62 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5 backdrop-blur">
            <div className="pointer-events-none absolute -right-16 -top-20 size-40 rounded-full bg-cyan-200/45 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 left-8 size-36 rounded-full bg-amber-200/35 blur-2xl" />
            <div className="relative">
              <ExpenseInput isSubmitting={isSubmitting} onSubmit={handleSubmit} />
              <FeedbackMessage feedback={feedback} />
              {pendingReview ? (
                <ExpenseReviewPanel
                  expense={pendingReview.expense}
                  isSaving={isSavingReview}
                  reasons={pendingReview.reasons}
                  suggestedBy={pendingReview.suggestedBy}
                  onCancel={() => {
                    setPendingReview(null);
                    setFeedback(null);
                  }}
                  onConfirm={handleConfirmReview}
                />
              ) : null}
            </div>
          </section>

          <div className="mt-5">
            <ExpenseSummary expenses={expenses} />
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Ultime aggiunte</h2>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="h-10 rounded-full border border-slate-200 bg-white/75 px-4 text-xs font-black text-slate-700 shadow-sm transition active:scale-[0.98]"
              >
                Apri storico
              </button>
            </div>
            <ExpenseList
              emptyMessage={isLoading ? "Carico le spese..." : "Nessuna spesa registrata."}
              expenses={recentExpenses}
            />
          </section>
        </div>
      ) : activeTab === "history" ? (
        <div className="flex flex-1 flex-col">
          <section className="rounded-[28px] border border-white/70 bg-slate-950 p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Storico</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-300">{filteredExpenses.length} spese filtrate</p>
                <p className="mt-1 text-3xl font-black leading-none">{currencyFormatter.format(filteredTotal)}</p>
              </div>
              <div className="grid shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleRefreshExpenses}
                  disabled={isRefreshing}
                  className="h-10 rounded-2xl border border-cyan-200/40 bg-cyan-200 px-4 text-xs font-black text-slate-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {isRefreshing ? "Aggiorno..." : "Aggiorna"}
                </button>
                <button
                  type="button"
                  onClick={() => setAreFiltersOpen((current) => !current)}
                  className="h-10 rounded-2xl bg-white px-4 text-xs font-black text-slate-950 transition active:scale-[0.98]"
                >
                  {areFiltersOpen || hasActiveFilters ? "Filtri" : "Filtra"}
                </button>
              </div>
            </div>
            {hasActiveFilters ? (
              <p className="mt-3 text-xs font-bold text-cyan-100">Filtri attivi sullo storico</p>
            ) : null}
          </section>
          <FeedbackMessage feedback={historyFeedback} />

          {areFiltersOpen || hasActiveFilters ? (
            <div className="mt-4">
              <ExpenseFilters
                filters={filters}
                resultCount={filteredExpenses.length}
                totalCount={expenses.length}
                onChange={setFilters}
              />
            </div>
          ) : null}

          <section className="mt-5 min-h-0 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Spese salvate</h2>
              {isLoading ? (
                <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-slate-500 shadow-sm">
                  Carico...
                </span>
              ) : null}
            </div>
            <ExpenseList
              deletingExpenseId={deletingExpenseId}
              emptyMessage={
                hasActiveFilters
                  ? "Nessuna spesa corrisponde ai filtri selezionati."
                  : "Nessuna spesa registrata."
              }
              expenses={filteredExpenses}
              groupByDate
              onDeleteExpense={handleDeleteExpense}
              onEditExpense={(expense) => {
                setEditingExpense(expense);
                setHistoryFeedback(null);
              }}
            />
          </section>
          {editingExpense ? (
            <div className="fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-md px-4">
              <ExpenseEditPanel
                key={editingExpense.id}
                expense={editingExpense}
                isSaving={isSavingEdit}
                onCancel={() => setEditingExpense(null)}
                onSave={handleSaveExpenseEdit}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <SettingsPanel expenses={expenses} onLockApp={handleLockApp} />
      )}

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[max(14px,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-white/70 bg-white/90 p-2 shadow-[0_18px_60px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5 backdrop-blur">
          <TabButton active={activeTab === "add"} label="Aggiungi" symbol="+" onClick={() => setActiveTab("add")} />
          <TabButton
            active={activeTab === "history"}
            label="Storico"
            symbol="ST"
            onClick={() => setActiveTab("history")}
          />
          <TabButton
            active={activeTab === "settings"}
            label="Impost."
            symbol="IM"
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </nav>
    </main>
  );
}

function SettingsPanel({ expenses, onLockApp }: { expenses: Expense[]; onLockApp: () => Promise<void> }) {
  const [storage, setStorage] = useState<StorageDiagnostics | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<Feedback>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [exportingScope, setExportingScope] = useState<"current" | "all" | null>(null);
  const [isRebuildingSummary, setIsRebuildingSummary] = useState(false);
  const localTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  useEffect(() => {
    let isMounted = true;

    async function loadStorageInfo() {
      try {
        const response = await fetch("/api/storage/diagnostics", { cache: "no-store" });
        const data = (await response.json()) as StorageDiagnostics;

        if (isMounted) {
          setStorage(data);
        }
      } catch {
        if (isMounted) {
          setStorage({ error: "Stato storage non disponibile", ready: false });
        }
      }
    }

    loadStorageInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCheckStorage() {
    setIsCheckingStorage(true);
    setSettingsFeedback(null);

    try {
      const response = await fetch("/api/storage/diagnostics", { method: "POST" });
      const data = (await response.json()) as StorageDiagnostics;

      if (!response.ok || data.ready === false) {
        throw new Error(data.error ?? "Diagnostica non riuscita");
      }

      setStorage(data);
      setSettingsFeedback({ tone: "success", message: "Storage pronto" });
    } catch (error) {
      setSettingsFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Diagnostica non riuscita",
      });
    } finally {
      setIsCheckingStorage(false);
    }
  }

  async function handleExportCsv(scope: "current" | "all") {
    setExportingScope(scope);
    setSettingsFeedback(null);

    try {
      const response = await fetch(`/api/expenses/export?scope=${scope}`, { cache: "no-store" });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Export non riuscito");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `spendino-expenses-${scope === "all" ? "complete" : "current"}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSettingsFeedback({ tone: "success", message: scope === "all" ? "Backup completo generato" : "CSV corrente generato" });
    } catch (error) {
      setSettingsFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Export non riuscito",
      });
    } finally {
      setExportingScope(null);
    }
  }

  async function handleRebuildSummary() {
    setIsRebuildingSummary(true);
    setSettingsFeedback(null);

    try {
      const response = await fetch("/api/storage/summary", { method: "POST" });
      const data = (await response.json()) as GeneralSummaryResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Riepilogo non aggiornato");
      }

      setSettingsFeedback({
        tone: "success",
        message: `Riepilogo aggiornato: ${data.yearCount ?? 0} anni, ${data.expenseCount ?? 0} spese`,
      });
    } catch (error) {
      setSettingsFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Riepilogo non aggiornato",
      });
    } finally {
      setIsRebuildingSummary(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="rounded-[28px] border border-white/70 bg-slate-950 p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Impostazioni</p>
        <h2 className="mt-2 text-3xl font-black leading-none">Controllo app</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Spese caricate" value={String(expenses.length)} />
          <StatTile label="Totale caricato" value={currencyFormatter.format(localTotal)} />
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/5 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Storage</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {storage?.mode === "google-sheets" ? "Google Sheets" : "Locale"}
            </h3>
          </div>
          <StatusPill ready={storage?.ready} />
        </div>

        <dl className="mt-4 space-y-2 text-sm font-bold text-slate-600">
          <InfoRow label="Tab operativo" value={storage?.sheetName ?? "Expenses"} />
          <InfoRow label="File configurato" value={storage?.spreadsheetIdConfigured ? "Si" : "No"} />
          <InfoRow label="Condivisione" value={storage?.shareWithEmailConfigured ? "Attiva" : "Non configurata"} />
          <InfoRow label="Generale" value={storage?.summarySheetReady === false ? "Da preparare" : "Pronto"} />
          <InfoRow label="Archivi" value={`${storage?.archiveSheetCount ?? 0} fogli`} />
          {storage?.archiveSheetNames?.length ? (
            <InfoRow label="Ultimo archivio" value={storage.archiveSheetNames[storage.archiveSheetNames.length - 1]} />
          ) : null}
          {storage?.generatedSpreadsheetId ? <InfoRow label="Nuovo file" value={storage.generatedSpreadsheetId} /> : null}
          {storage?.checkedAt ? <InfoRow label="Ultimo controllo" value={formatDateTime(storage.checkedAt)} /> : null}
        </dl>

        <button
          type="button"
          onClick={handleCheckStorage}
          disabled={isCheckingStorage}
          className="mt-4 h-12 w-full rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.20)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
        >
          {isCheckingStorage ? "Controllo..." : "Verifica storage"}
        </button>
      </section>

      <section className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={() => handleExportCsv("current")}
          disabled={exportingScope !== null}
          className="h-14 rounded-2xl border border-cyan-200 bg-white/80 px-4 text-sm font-black text-cyan-900 shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {exportingScope === "current" ? "Esporto..." : "Esporta CSV corrente"}
        </button>
        <button
          type="button"
          onClick={() => handleExportCsv("all")}
          disabled={exportingScope !== null}
          className="h-14 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-950 shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {exportingScope === "all" ? "Preparo backup..." : "Backup CSV completo"}
        </button>
        <button
          type="button"
          onClick={handleRebuildSummary}
          disabled={isRebuildingSummary}
          className="h-14 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-950 shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {isRebuildingSummary ? "Aggiorno riepilogo..." : "Ricostruisci Generale"}
        </button>
        <button
          type="button"
          onClick={onLockApp}
          className="h-14 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-900 shadow-sm transition active:scale-[0.99]"
        >
          Blocca app
        </button>
      </section>

      <FeedbackMessage feedback={settingsFeedback} />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-white">{value}</p>
    </div>
  );
}

function StatusPill({ ready }: { ready?: boolean }) {
  const label = ready === undefined ? "Info" : ready ? "OK" : "Errore";
  const className =
    ready === undefined
      ? "bg-slate-100 text-slate-700"
      : ready
        ? "bg-emerald-100 text-emerald-900"
        : "bg-red-100 text-red-900";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[58%] break-words text-right text-slate-950">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function PinUnlockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPin = pin.trim();

    if (!trimmedPin) {
      return;
    }

    setIsUnlocking(true);
    setError("");

    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: trimmedPin }),
      });
      const data = (await response.json()) as { unlocked?: boolean; error?: string };

      if (!response.ok || !data.unlocked) {
        throw new Error(data.error ?? "PIN non corretto");
      }

      window.localStorage.setItem("spendino-unlocked-at", new Date().toISOString());
      onUnlocked();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "PIN non corretto");
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-[max(22px,env(safe-area-inset-top))]">
      <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5 backdrop-blur">
        <div className="pointer-events-none absolute -right-16 -top-20 size-40 rounded-full bg-cyan-200/45 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-8 size-36 rounded-full bg-amber-200/35 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-800">Accesso personale</p>
          <h1 className="mt-2 text-4xl font-black leading-none text-slate-950">Sblocca Spendino</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
            Inserisci il PIN una volta su questo dispositivo. La PWA lo ricordera per gli accessi successivi.
          </p>

          <form onSubmit={handleUnlock} className="mt-5 space-y-3">
            <label htmlFor="spendino-pin" className="block text-sm font-black uppercase tracking-[0.14em] text-slate-600">
              PIN
            </label>
            <input
              id="spendino-pin"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              className="h-14 w-full rounded-2xl border border-white/70 bg-white/90 px-4 text-center text-2xl font-black tracking-[0.2em] text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.10)] outline-none ring-1 ring-slate-900/5 transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
            <button
              type="submit"
              disabled={isUnlocking || pin.trim().length === 0}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-base font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
            >
              {isUnlocking ? "Sblocco..." : "Entra"}
            </button>
            {error ? (
              <p role="status" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-900">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}

function isErrorResponse(value: Expense | { error?: string }): value is { error?: string } {
  return "error" in value;
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) {
    return null;
  }

  return (
    <p
      role="status"
      className={`mt-3 rounded-2xl border px-3 py-2 text-sm font-bold ${
        feedback.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      <span
        className={`mr-2 inline-grid size-5 place-items-center rounded-full text-[10px] text-white ${
          feedback.tone === "success" ? "bg-emerald-700" : "bg-red-700"
        }`}
      >
        {feedback.tone === "success" ? "OK" : "!"}
      </span>
      <span>{feedback.message}</span>
    </p>
  );
}

function TabButton({
  active,
  label,
  onClick,
  symbol,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  symbol: string;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex h-14 items-center justify-center gap-2 rounded-[18px] text-sm font-black transition active:scale-[0.98] ${
        active
          ? "bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.24)]"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <span
        className={`grid size-7 place-items-center rounded-xl text-sm ${
          active ? "bg-cyan-300 text-slate-950" : "bg-slate-100 text-slate-700"
        }`}
      >
        {symbol}
      </span>
      {label}
    </button>
  );
}

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
