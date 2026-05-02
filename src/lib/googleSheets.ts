import { appendLocalExpense, deleteLocalExpense, listLocalExpenses } from "@/lib/localExpenseStore";
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
  checkedAt: string;
  ready: boolean;
  spreadsheetId?: string;
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
      checkedAt: new Date().toISOString(),
      ready: true,
    };
  }

  const readyConfig = await prepareGoogleSheets(config);

  return {
    ...getStorageInfo(),
    checkedAt: new Date().toISOString(),
    ready: true,
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
  const range = encodeURIComponent(`${readyConfig.sheetName}!A:J`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${readyConfig.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
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

export async function deleteExpense(id: string): Promise<boolean> {
  const config = getConfig();

  if (!config) {
    return deleteLocalExpense(id);
  }

  const readyConfig = await prepareGoogleSheets(config);
  const token = await getAccessToken(readyConfig);
  const rowNumber = await findExpenseRowNumber(readyConfig, token, id);

  if (!rowNumber) {
    return false;
  }

  const sheetId = await getSheetId(readyConfig, token);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${readyConfig.spreadsheetId}:batchUpdate`,
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

  return true;
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

  await ensureSheetExists(readyConfig, token);
  await ensureHeaderRow(readyConfig, token);

  return readyConfig;
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
  const exists = data.sheets?.some((sheet) => sheet.properties?.title === config.sheetName);

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

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("Token Google Sheets mancante");
  }

  return data.access_token;
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
