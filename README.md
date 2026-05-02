# Spendino

Spendino e una PWA mobile-first per registrare spese quotidiane con frasi naturali, ad esempio `12,50 pranzo al bar`.
Quando il browser lo supporta, il pulsante microfono usa la Web Speech API per dettare la frase in italiano e salva automaticamente quando la dettatura finisce.
Su smartphone la dettatura dipende dal browser e richiede HTTPS in produzione.

## Avvio

```bash
pnpm install
pnpm dev
```

Apri `http://localhost:3000`.

## Protezione con PIN

Spendino richiede un PIN prima di mostrare l'app e prima di usare le API delle spese.
Configura in produzione:

```env
APP_PIN=1234
APP_AUTH_SECRET=
APP_ALLOWED_ORIGIN=
```

`APP_PIN` e il PIN personale. `APP_AUTH_SECRET` firma il cookie persistente di sblocco; usa una stringa lunga e casuale.
`APP_ALLOWED_ORIGIN` e opzionale; in produzione puoi impostarlo alla URL HTTPS dell'app per rendere piu esplicito il controllo origine delle API.
Dopo il primo sblocco sul cellulare, il cookie resta valido per circa 180 giorni. Per bloccare di nuovo l'app, cancella i dati del sito/app dal browser o dalla PWA.

Questa e una protezione leggera per uso personale, non un sistema di autenticazione multiutente.

## Installazione su telefono

Spendino e configurata come PWA installabile. In produzione deve essere servita via HTTPS, ad esempio da Vercel o da un dominio personale con certificato valido.

Su Android apri l'URL in Chrome e scegli `Installa app` o `Aggiungi a schermata Home`.
Su iPhone apri l'URL in Safari, usa Condividi e scegli `Aggiungi alla schermata Home`.

Il service worker viene registrato solo in produzione: la shell dell'app resta apribile offline, mentre lettura, salvataggio e cancellazione delle spese richiedono connessione al backend.

## Google Sheets

L'app usa Google Sheets quando sono configurate queste variabili in `.env.local`:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_SHEET_NAME=Expenses
GOOGLE_SHEETS_SPREADSHEET_TITLE=Spendino Expenses
GOOGLE_SHEETS_SHARE_WITH_EMAIL=
```

Il foglio deve avere queste colonne:

```text
id | date | amount | currency | category | description | rawInput | source | createdAt | notes
```

Senza credenziali Google, l'app salva i dati in locale in `data/expenses.json`, utile per lo sviluppo.
Con credenziali Google configurate, l'app verifica automaticamente il file, crea la tab `Expenses` se manca e prepara le intestazioni.
Se `GOOGLE_SHEETS_SPREADSHEET_ID` manca o punta a un file non trovato, l'app crea un nuovo Google Sheet e scrive nei log lo `spreadsheetId` da copiare nelle variabili ambiente per renderlo stabile.
Se imposti `GOOGLE_SHEETS_SHARE_WITH_EMAIL`, l'app prova anche a condividere il nuovo file con quella email come editor; per questa opzione serve abilitare anche la Google Drive API nel progetto Google Cloud.

## Impostazioni

Il tab `Impost.` permette di:

- vedere lo stato dello storage configurato;
- lanciare manualmente la diagnostica Google Sheets;
- esportare le spese in CSV;
- bloccare di nuovo l'app sul dispositivo.

## Classificazione AI

La categorizzazione AI con Gemini e opzionale. In `.env.local`:

```env
GEMINI_API_KEY=
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
AI_CLASSIFICATION_ENABLED=true
AI_CLASSIFICATION_COMPARE=false
```

Se la AI non e configurata o fallisce, Spendino usa sempre la categorizzazione locale rule-based.
La API key vive solo lato server; l'account Google usato per generarla non deve coincidere con l'account usato sul cellulare.
Per confrontare categoria locale e Gemini nei log server durante lo sviluppo, imposta `AI_CLASSIFICATION_COMPARE=true`.

## Script

- `pnpm dev`: avvia l'app in sviluppo
- `pnpm build`: crea la build di produzione
- `pnpm test:parser`: verifica parser, date naturali e categorizzazione principale
- `pnpm test:categories`: verifica metadati e fallback categorie
- `pnpm test:classifier`: verifica fallback e classificatore locale/AI
- `pnpm test:expense-review`: verifica quando mostrare la revisione prima del salvataggio
- `pnpm test:filters`: verifica i filtri dello storico
- `pnpm test:local-store`: verifica cancellazione nello storage locale di sviluppo
- `pnpm test:auth`: verifica PIN e token firmato di sblocco
- `pnpm test`: esegue i test disponibili
- `pnpm typecheck`: controlla TypeScript
