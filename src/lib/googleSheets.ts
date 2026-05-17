import {
  appendLocalExpense,
  deleteLocalExpense,
  getLocalExpense,
  listLocalExpenses,
  updateLocalExpense,
} from "@/lib/localExpenseStore";
import {
  GENERAL_SUMMARY_SHEET_NAME,
  buildGeneralSummaryRows,
  generalSummaryRowsToSheetValues,
  getExpenseTargetSheetName,
  isArchiveSheetName,
} from "@/lib/expenseArchive";
import { isExpenseCategory, type Expense } from "@/types/expense";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_SCOPE = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");
const DEFAULT_SPREADSHEET_TITLE = "Spendino Expenses";
const EXPENSE_HEADERS = [
  "id",
  "date",
  "amount",
  "currency",
  "category",
  "description",
  "rawInput",
  "source",
  "createdAt",
  "notes",
];

let generatedSpreadsheetId: string | null = null;
let setupPromise: Promise<Required<GoogleSheetsConfig>> | null = null;
let accessTokenCache: {
  clientEmail: string;
  expiresAt: number;
  privateKey: string;
  token: string;
} | null = null;

type GoogleSheetsConfig = {
  clientEmail: string;
  privateKey: string;
  spreadsheetId?: string;
  sheetName: string;
};

export type StorageInfo = {
  generatedSpreadsheetId?: string;
  mode: "google-sheets" | "local";
  shareWithEmailConfigured: boolean;
  sheetName: string;
  spreadsheetIdConfigured: boolean;
  spreadsheetTitle: string;
};

export type StorageDiagnostics = StorageInfo & {
  archiveSheetCount?: number;
  archiveSheetNames?: string[];
  checkedAt: string;
  operationalSheetReady?: boolean;
  ready: boolean;
  summarySheetName?: string;
  summarySheetReady?: boolean;
  spreadsheetId?: string;
};

export type GeneralSummaryResult = {
  checkedAt: string;
  expenseCount: number;
  mode: "google-sheets" | "local";
  sheetName: string;
  yearCount: number;
};

type ExpenseSheetLocation = {
  expense: Expense;
  rowNumber: number;
  sheetName: string;
};

type ExpenseSheetRow = {
  expense: Expense;
  rowNumber: number;
};

function getConfig(): GoogleSheetsConfig | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Expenses";

  if (!clientEmail || !privateKey) {
    return null;
  }

  return { clientEmail, privateKey, spreadsheetId: spreadsheetId || generatedSpreadsheetId || undefined, sheetName };
}

export function getStorageInfo(): StorageInfo {
  const config = getConfig();

  return {
    generatedSpreadsheetId: generatedSpreadsheetId ?? undefined,
    mode: config ? "google-sheets" : "local",
    shareWithEmailConfigured: Boolean(process.env.GOOGLE_SHEETS_SHARE_WITH_EMAIL?.trim()),
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || "Expenses",
    spreadsheetIdConfigured: Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || generatedSpreadsheetId),
    spreadsheetTitle: process.env.GOOGLE_SHEETS_SPREADSHEET_TITLE || DEFAULT_SPREADSHEET_TITLE,
  };
}

export async function runStorageDiagnostics(): Promise<StorageDiagnostics> {
  const info = getStorageInfo();
  const config = getConfig();

  if (!config) {
    return {
      ...info,
      archiveSheetCount: 0,
      archiveSheetNames: [],
      checkedAt: new Date().toISOString(),
      operationalSheetReady: true,
      ready: true,
      summarySheetName: GENERAL_SUMMARY_SHEET_NAME,
      summarySheetReady: true,
    };
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  await ensureSheetExists({ ...readyConfig, sheetName: GENERAL_SUMMARY_SHEET_NAME }, token);
  const sheetTitles = await getSheetTitles(readyConfig, token);
  const archiveSheetNames = sheetTitles.filter(isArchiveSheetName).sort();

  return {
    ...getStorageInfo(),
    archiveSheetCount: archiveSheetNames.length,
    archiveSheetNames,
    checkedAt: new Date().toISOString(),
    operationalSheetReady: sheetTitles.includes(readyConfig.sheetName),
    ready: true,
    summarySheetName: GENERAL_SUMMARY_SHEET_NAME,
    summarySheetReady: sheetTitles.includes(GENERAL_SUMMARY_SHEET_NAME),
    spreadsheetId: readyConfig.spreadsheetId,
  };
}

export async function appendExpense(expense: Expense): Promise<void> {
  const config = getConfig();

  if (!config) {
    await appendLocalExpense(expense);
    return;
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  const targetSheetName = getExpenseTargetSheetName(expense.date, readyConfig.sheetName);
  await ensureExpenseSheetReady(readyConfig, token, targetSheetName);
  await appendExpenseRow(readyConfig, token, targetSheetName, expense);
}

async function appendExpenseRow(
  config: Required<GoogleSheetsConfig>,
  token: string,
  sheetName: string,
  expense: Expense,
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:J`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [expenseToRow(expense)],
      }),
    },
  );

  if (!response.ok) {
    await logGoogleApiError("salvataggio spesa", response);
    throw new Error("Non sono riuscito a salvare la spesa su Google Sheets");
  }
}

export async function listExpenses(limit = 50): Promise<Expense[]> {
  const config = getConfig();

  if (!config) {
    return listLocalExpenses(limit);
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  await archivePastOperationalExpenses(readyConfig, token);
  const range = encodeURIComponent(`${readyConfig.sheetName}!A2:J`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${readyConfig.spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await logGoogleApiError("lettura spese", response);
    throw new Error("Non sono riuscito a leggere le spese da Google Sheets");
  }

  const data = (await response.json()) as { values?: string[][] };
  return (data.values ?? [])
    .map(rowToExpense)
    .filter((expense): expense is Expense => Boolean(expense))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

export async function listAllExpenses(limit = 50000): Promise<Expense[]> {
  const config = getConfig();

  if (!config) {
    return listLocalExpenses(limit);
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  await archivePastOperationalExpenses(readyConfig, token);

  return (await listAllStoredExpenses(readyConfig, token)).slice(0, limit);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const config = getConfig();

  if (!config) {
    return getLocalExpense(id);
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  return (await findExpenseLocation(readyConfig, token, id))?.expense ?? null;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const config = getConfig();

  if (!config) {
    return deleteLocalExpense(id);
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  const location = await findExpenseLocation(readyConfig, token, id);

  if (!location) {
    return false;
  }

  await deleteExpenseRow(readyConfig, token, location.sheetName, location.rowNumber);
  return true;
}

async function deleteExpenseRow(
  config: Required<GoogleSheetsConfig>,
  token: string,
  sheetName: string,
  rowNumber: number,
): Promise<void> {
  const sheetId = await getSheetId({ ...config, sheetName }, token);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    await logGoogleApiError("cancellazione spesa", response);
    throw new Error("Non sono riuscito a cancellare la spesa da Google Sheets");
  }
}

export async function updateExpense(expense: Expense): Promise<Expense | null> {
  const config = getConfig();

  if (!config) {
    return updateLocalExpense(expense);
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  const location = await findExpenseLocation(readyConfig, token, expense.id);

  if (!location) {
    return null;
  }

  const targetSheetName = getExpenseTargetSheetName(expense.date, readyConfig.sheetName);

  if (targetSheetName !== location.sheetName) {
    await ensureExpenseSheetReady(readyConfig, token, targetSheetName);
    await appendExpenseRow(readyConfig, token, targetSheetName, expense);
    await deleteExpenseRow(readyConfig, token, location.sheetName, location.rowNumber);
    return expense;
  }

  const range = encodeURIComponent(`${location.sheetName}!A${location.rowNumber}:J${location.rowNumber}`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${readyConfig.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [expenseToRow(expense)],
      }),
    },
  );

  if (!response.ok) {
    await logGoogleApiError("modifica spesa", response);
    throw new Error("Non sono riuscito a modificare la spesa su Google Sheets");
  }

  return expense;
}

export async function rebuildGeneralSummary(): Promise<GeneralSummaryResult> {
  const config = getConfig();

  if (!config) {
    const expenses = await listLocalExpenses(50000);
    const rows = buildGeneralSummaryRows(expenses);

    return {
      checkedAt: new Date().toISOString(),
      expenseCount: expenses.length,
      mode: "local",
      sheetName: GENERAL_SUMMARY_SHEET_NAME,
      yearCount: rows.length,
    };
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  const expenses = await listAllStoredExpenses(readyConfig, token);
  const rows = buildGeneralSummaryRows(expenses);

  await writeGeneralSummarySheet(readyConfig, token, rows);

  return {
    checkedAt: new Date().toISOString(),
    expenseCount: expenses.length,
    mode: "google-sheets",
    sheetName: GENERAL_SUMMARY_SHEET_NAME,
    yearCount: rows.length,
  };
}

async function prepareGoogleSheets(config: GoogleSheetsConfig): Promise<Required<GoogleSheetsConfig>> {
  if (!setupPromise) {
    setupPromise = setupGoogleSheets(config).catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  return setupPromise;
}

async function setupGoogleSheets(config: GoogleSheetsConfig): Promise<Required<GoogleSheetsConfig>> {
  const token = await getAccessToken(config);
  const readyConfig = await resolveSpreadsheet(config, token);

  await ensureExpenseSheetReady(readyConfig, token, readyConfig.sheetName);

  return readyConfig;
}

async function ensureExpenseSheetReady(
  config: Required<GoogleSheetsConfig>,
  token: string,
  sheetName: string,
): Promise<void> {
  const sheetConfig = { ...config, sheetName };
  await ensureSheetExists(sheetConfig, token);
  await ensureHeaderRow(sheetConfig, token);
}

async function resolveSpreadsheet(
  config: GoogleSheetsConfig,
  token: string,
): Promise<Required<GoogleSheetsConfig>> {
  if (config.spreadsheetId) {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}?fields=spreadsheetId,properties.title`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.ok) {
      return {
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
      };
    }

    if (response.status !== 404) {
      await logGoogleApiError("lettura file configurato", response);
      throw new Error("Non sono riuscito a leggere il file Google Sheets configurato");
    }
  }

  return createSpreadsheet(config, token);
}

async function createSpreadsheet(
  config: GoogleSheetsConfig,
  token: string,
): Promise<Required<GoogleSheetsConfig>> {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: process.env.GOOGLE_SHEETS_SPREADSHEET_TITLE || DEFAULT_SPREADSHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: config.sheetName,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    await logGoogleApiError("creazione file", response);
    throw new Error("Non sono riuscito a creare il file Google Sheets");
  }

  const data = (await response.json()) as { spreadsheetId?: string };

  if (!data.spreadsheetId) {
    throw new Error("Google Sheets non ha restituito lo spreadsheetId");
  }

  generatedSpreadsheetId = data.spreadsheetId;
  await shareCreatedSpreadsheet(data.spreadsheetId, token);
  console.info(
    `Spendino ha creato un nuovo Google Sheet. Imposta GOOGLE_SHEETS_SPREADSHEET_ID=${data.spreadsheetId} per renderlo stabile.`,
  );

  return {
    clientEmail: config.clientEmail,
    privateKey: config.privateKey,
    spreadsheetId: data.spreadsheetId,
    sheetName: config.sheetName,
  };
}

async function shareCreatedSpreadsheet(spreadsheetId: string, token: string): Promise<void> {
  const shareWithEmail = process.env.GOOGLE_SHEETS_SHARE_WITH_EMAIL?.trim();

  if (!shareWithEmail) {
    return;
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "writer",
      type: "user",
      emailAddress: shareWithEmail,
    }),
  });

  if (!response.ok) {
    await logGoogleApiError("condivisione file", response);
    console.warn(
      `Spendino ha creato il Google Sheet ${spreadsheetId}, ma non e riuscito a condividerlo con ${shareWithEmail}. Verifica che la Google Drive API sia abilitata.`,
    );
  }
}

async function ensureSheetExists(config: Required<GoogleSheetsConfig>, token: string): Promise<void> {
  const exists = (await getSheetTitles(config, token)).includes(config.sheetName);

  if (exists) {
    return;
  }

  const createResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: config.sheetName,
              },
            },
          },
        ],
      }),
    },
  );

  if (!createResponse.ok) {
    await logGoogleApiError("creazione tab", createResponse);
    throw new Error("Non sono riuscito a creare la tab Google Sheets per Spendino");
  }
}

async function getSheetTitles(config: Required<GoogleSheetsConfig>, token: string): Promise<string[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await logGoogleApiError("verifica tab", response);
    throw new Error("Non sono riuscito a verificare le tab del file Google Sheets");
  }

  const data = (await response.json()) as {
    sheets?: Array<{
      properties?: {
        title?: string;
      };
    }>;
  };

  return (data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title));
}

async function ensureHeaderRow(config: Required<GoogleSheetsConfig>, token: string): Promise<void> {
  const range = encodeURIComponent(`${config.sheetName}!A1:J1`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [EXPENSE_HEADERS],
      }),
    },
  );

  if (!response.ok) {
    await logGoogleApiError("preparazione intestazioni", response);
    throw new Error("Non sono riuscito a preparare le intestazioni Google Sheets");
  }
}

function expenseToRow(expense: Expense): string[] {
  return [
    expense.id,
    expense.date,
    String(expense.amount),
    expense.currency,
    expense.category,
    expense.description,
    expense.rawInput,
    expense.source,
    expense.createdAt,
    expense.notes ?? "",
  ];
}

function rowToExpense(row: string[]): Expense | null {
  const [id, date, amount, currency, category, description, rawInput, source, createdAt, notes] = row;

  if (!id || !date || !amount || currency !== "EUR") {
    return null;
  }

  return {
    id,
    date,
    amount: Number.parseFloat(amount.replace(",", ".")),
    currency,
    category: isExpenseCategory(category) ? category : "other",
    description: description || "Spesa",
    rawInput: rawInput || description || "",
    source: source === "voice" ? "voice" : "text",
    createdAt: createdAt || new Date().toISOString(),
    notes: notes || undefined,
  };
}

async function listAllStoredExpenses(
  config: Required<GoogleSheetsConfig>,
  token: string,
): Promise<Expense[]> {
  const sheetNames = await listExpenseSheetNames(config, token);
  const expenseGroups = await Promise.all(
    sheetNames.map((sheetName) => listExpensesFromSheet(config, token, sheetName)),
  );

  return expenseGroups
    .flat()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

async function listExpensesFromSheet(
  config: Required<GoogleSheetsConfig>,
  token: string,
  sheetName: string,
): Promise<Expense[]> {
  const range = encodeURIComponent(`${sheetName}!A2:J`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await logGoogleApiError(`lettura spese ${sheetName}`, response);
    throw new Error("Non sono riuscito a leggere le spese da Google Sheets");
  }

  const data = (await response.json()) as { values?: string[][] };
  return (data.values ?? [])
    .map(rowToExpense)
    .filter((expense): expense is Expense => Boolean(expense));
}

async function listExpenseRowsFromSheet(
  config: Required<GoogleSheetsConfig>,
  token: string,
  sheetName: string,
): Promise<ExpenseSheetRow[]> {
  const range = encodeURIComponent(`${sheetName}!A2:J`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await logGoogleApiError(`lettura righe ${sheetName}`, response);
    throw new Error("Non sono riuscito a leggere le spese da Google Sheets");
  }

  const data = (await response.json()) as { values?: string[][] };

  return (data.values ?? [])
    .map((row, index) => {
      const expense = rowToExpense(row);
      return expense ? { expense, rowNumber: index + 2 } : null;
    })
    .filter((row): row is ExpenseSheetRow => Boolean(row));
}

async function archivePastOperationalExpenses(
  config: Required<GoogleSheetsConfig>,
  token: string,
): Promise<void> {
  const rows = await listExpenseRowsFromSheet(config, token, config.sheetName);
  const rowsToArchive = rows.filter(
    (row) => getExpenseTargetSheetName(row.expense.date, config.sheetName) !== config.sheetName,
  );

  if (rowsToArchive.length === 0) {
    return;
  }

  for (const row of rowsToArchive) {
    const archiveSheetName = getExpenseTargetSheetName(row.expense.date, config.sheetName);
    await ensureExpenseSheetReady(config, token, archiveSheetName);
    await appendExpenseRow(config, token, archiveSheetName, row.expense);
  }

  const rowsDescending = [...rowsToArchive].sort((left, right) => right.rowNumber - left.rowNumber);

  for (const row of rowsDescending) {
    await deleteExpenseRow(config, token, config.sheetName, row.rowNumber);
  }
}

async function listExpenseSheetNames(config: Required<GoogleSheetsConfig>, token: string): Promise<string[]> {
  const sheetTitles = await getSheetTitles(config, token);
  const archiveSheetNames = sheetTitles.filter(isArchiveSheetName).sort();
  return [config.sheetName, ...archiveSheetNames];
}

async function findExpenseLocation(
  config: Required<GoogleSheetsConfig>,
  token: string,
  id: string,
): Promise<ExpenseSheetLocation | null> {
  for (const sheetName of await listExpenseSheetNames(config, token)) {
    const rowNumber = await findExpenseRowNumber({ ...config, sheetName }, token, id);

    if (!rowNumber) {
      continue;
    }

    const expense = await readExpenseRow({ ...config, sheetName }, token, rowNumber);

    if (expense) {
      return { expense, rowNumber, sheetName };
    }
  }

  return null;
}

async function readExpenseRow(
  config: Required<GoogleSheetsConfig>,
  token: string,
  rowNumber: number,
): Promise<Expense | null> {
  const range = encodeURIComponent(`${config.sheetName}!A${rowNumber}:J${rowNumber}`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await logGoogleApiError("lettura spesa", response);
    throw new Error("Non sono riuscito a leggere la spesa da Google Sheets");
  }

  const data = (await response.json()) as { values?: string[][] };
  return rowToExpense(data.values?.[0] ?? []);
}

async function writeGeneralSummarySheet(
  config: Required<GoogleSheetsConfig>,
  token: string,
  rows: ReturnType<typeof buildGeneralSummaryRows>,
): Promise<void> {
  const summaryConfig = { ...config, sheetName: GENERAL_SUMMARY_SHEET_NAME };

  await ensureSheetExists(summaryConfig, token);
  await clearSheetRange(summaryConfig, token, "A:N");

  const range = encodeURIComponent(`${GENERAL_SUMMARY_SHEET_NAME}!A1:N`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: generalSummaryRowsToSheetValues(rows),
      }),
    },
  );

  if (!response.ok) {
    await logGoogleApiError("scrittura riepilogo generale", response);
    throw new Error("Non sono riuscito ad aggiornare il foglio Generale");
  }
}

async function clearSheetRange(
  config: Required<GoogleSheetsConfig>,
  token: string,
  rangeA1: string,
): Promise<void> {
  const range = encodeURIComponent(`${config.sheetName}!${rangeA1}`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  if (!response.ok) {
    await logGoogleApiError("pulizia riepilogo generale", response);
    throw new Error("Non sono riuscito a preparare il foglio Generale");
  }
}

async function findExpenseRowNumber(
  config: Required<GoogleSheetsConfig>,
  token: string,
  id: string,
): Promise<number | null> {
  const range = encodeURIComponent(`${config.sheetName}!A2:A`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await logGoogleApiError("ricerca spesa", response);
    throw new Error("Non sono riuscito a cercare la spesa su Google Sheets");
  }

  const data = (await response.json()) as { values?: string[][] };
  const rowIndex = (data.values ?? []).findIndex((row) => row[0] === id);

  return rowIndex === -1 ? null : rowIndex + 2;
}

async function getSheetId(config: Required<GoogleSheetsConfig>, token: string): Promise<number> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}?fields=sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await logGoogleApiError("lettura proprieta foglio", response);
    throw new Error("Non sono riuscito a leggere il foglio Google Sheets");
  }

  const data = (await response.json()) as {
    sheets?: Array<{
      properties?: {
        title?: string;
        sheetId?: number;
      };
    }>;
  };
  const sheet = data.sheets?.find((candidate) => candidate.properties?.title === config.sheetName);
  const sheetId = sheet?.properties?.sheetId;

  if (typeof sheetId !== "number") {
    throw new Error("Foglio Google Sheets non trovato");
  }

  return sheetId;
}

async function getAccessToken(config: GoogleSheetsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await createJwt(
    {
      alg: "RS256",
      typ: "JWT",
    },
    {
      iss: config.clientEmail,
      scope: GOOGLE_API_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      exp: now + 3600,
      iat: now,
    },
    config.privateKey,
  );

  const cachedToken = getCachedAccessToken(config);

  if (cachedToken) {
    return cachedToken;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    await logGoogleApiError("autenticazione", response);
    throw new Error("Autenticazione Google Sheets non riuscita");
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };

  if (!data.access_token) {
    throw new Error("Token Google Sheets mancante");
  }

  cacheAccessToken(config, data.access_token, data.expires_in);
  return data.access_token;
}

function getCachedAccessToken(config: GoogleSheetsConfig): string | null {
  if (
    accessTokenCache &&
    accessTokenCache.clientEmail === config.clientEmail &&
    accessTokenCache.privateKey === config.privateKey &&
    accessTokenCache.expiresAt > Date.now()
  ) {
    return accessTokenCache.token;
  }

  return null;
}

function cacheAccessToken(config: GoogleSheetsConfig, token: string, expiresInSeconds = 3600): void {
  const safetyMarginMs = 60 * 1000;
  const expiresInMs = Math.max(0, expiresInSeconds * 1000 - safetyMarginMs);

  accessTokenCache = {
    clientEmail: config.clientEmail,
    expiresAt: Date.now() + expiresInMs,
    privateKey: config.privateKey,
    token,
  };
}

async function createJwt(header: object, payload: object, privateKeyPem: string): Promise<string> {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken));

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function base64UrlEncode(value: string | ArrayBuffer): string {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function logGoogleApiError(action: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => "");

  console.error("Errore Google API Spendino", {
    action,
    body: body.slice(0, 1200),
    status: response.status,
    statusText: response.statusText,
  });
}
