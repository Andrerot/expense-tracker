import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Expense } from "@/types/expense";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "expenses.json");

function getDataFile(): string {
  return process.env.SPENDINO_LOCAL_EXPENSES_FILE || DATA_FILE;
}

async function readLocalExpenses(): Promise<Expense[]> {
  try {
    const content = await readFile(getDataFile(), "utf8");
    return JSON.parse(content) as Expense[];
  } catch {
    return [];
  }
}

async function writeLocalExpenses(expenses: Expense[]) {
  const dataFile = getDataFile();
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(expenses, null, 2), "utf8");
}

export async function appendLocalExpense(expense: Expense): Promise<void> {
  const expenses = await readLocalExpenses();
  await writeLocalExpenses([expense, ...expenses]);
}

export async function listLocalExpenses(limit = 50): Promise<Expense[]> {
  const expenses = await readLocalExpenses();
  return expenses
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

export async function getLocalExpense(id: string): Promise<Expense | null> {
  const expenses = await readLocalExpenses();
  return expenses.find((expense) => expense.id === id) ?? null;
}

export async function deleteLocalExpense(id: string): Promise<boolean> {
  const expenses = await readLocalExpenses();
  const nextExpenses = expenses.filter((expense) => expense.id !== id);

  if (nextExpenses.length === expenses.length) {
    return false;
  }

  await writeLocalExpenses(nextExpenses);
  return true;
}

export async function updateLocalExpense(expense: Expense): Promise<Expense | null> {
  const expenses = await readLocalExpenses();
  const expenseIndex = expenses.findIndex((currentExpense) => currentExpense.id === expense.id);

  if (expenseIndex === -1) {
    return null;
  }

  const nextExpenses = [...expenses];
  nextExpenses[expenseIndex] = expense;
  await writeLocalExpenses(nextExpenses);
  return expense;
}
