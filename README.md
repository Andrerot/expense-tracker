# Spendino

Spendino e una PWA mobile-first per registrare spese quotidiane con testo naturale o dettatura vocale.
E pensata per uso personale di lungo periodo con Google Sheets come archivio principale e fallback locale per sviluppo.

Esempi supportati:

```text
12,50 pranzo al bar
20€ pranzo primo maggio
dodici euro e cinquanta bar
35 euro benzina lunedi scorso
8 treno 15 novembre 2025
```

## Avvio Locale

```bash
pnpm install
pnpm dev
```

Apri `http://localhost:3000`.

Se `pnpm` non e disponibile ma `node_modules` e gia presente:

```bash
node node_modules/next/dist/bin/next dev
```

## Funzioni Principali

- Inserimento spese da testo naturale in italiano.
- Input vocale tramite Web Speech API quando supportata dal browser.
- Parsing locale di importo, descrizione e data.
- Categorizzazione rule-based con AI Gemini opzionale.
- Revisione prima del salvataggio per casi incerti.
- PIN personale con cookie httpOnly firmato.
- Tab `Aggiungi`, `Storico` e `Impost.`.
- Modifica e cancellazione spese dallo storico.
- Filtri per periodo, categoria, sorgente e ricerca testuale.
- Riepiloghi in app: oggi, mese, anno e media giornaliera del mese.
- Export CSV corrente e backup CSV completo.
- Archiviazione storica automatica su fogli annuali.

## Protezione con PIN

Configura in produzione:

```env
APP_PIN=1234
APP_AUTH_SECRET=
APP_ALLOWED_ORIGIN=
```

`APP_PIN` e il PIN personale.
`APP_AUTH_SECRET` firma il cookie persistente di sblocco; genera una stringa lunga e casuale e non dovrai ricordarla.
`APP_ALLOWED_ORIGIN` e opzionale ma consigliato in produzione con la URL HTTPS dell'app.

Il cookie resta valido per circa 180 giorni. Il tab `Impost.` contiene il pulsante `Blocca app`.
Lo sblocco PIN ha un rate limit locale per ridurre tentativi ripetuti.

Questa resta una protezione leggera per uso personale, non autenticazione multiutente.

## Google Sheets

Variabili ambiente:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_SHEET_NAME=Expenses
GOOGLE_SHEETS_SPREADSHEET_TITLE=Spendino Expenses
GOOGLE_SHEETS_SHARE_WITH_EMAIL=
```

Quando Google Sheets e configurato, Spendino prepara automaticamente file, tab e intestazioni mancanti.
Se `GOOGLE_SHEETS_SPREADSHEET_ID` manca o non esiste, crea un nuovo file e scrive nei log lo `spreadsheetId` da rendere stabile nelle variabili ambiente.

### Struttura Fogli

`Expenses` contiene l'anno corrente e le spese future operative.

Le spese di anni passati vengono salvate o spostate automaticamente in:

```text
Archive_Detail_YYYY
```

Esempio:

```text
Archive_Detail_2025
Archive_Detail_2026
```

Il foglio `Generale` contiene il riepilogo annuale e mensile:

```text
Anno | Gen | Feb | Mar | Apr | Mag | Giu | Lug | Ago | Set | Ott | Nov | Dic | Totale
```

Le righe di spesa usano sempre:

```text
id | date | amount | currency | category | description | rawInput | source | createdAt | notes
```

## Impostazioni

Il tab `Impost.` permette di:

- vedere modalità storage, stato `Expenses`, stato `Generale` e archivi rilevati;
- lanciare diagnostica storage;
- esportare CSV corrente;
- generare backup CSV completo con `Expenses + Archive_Detail_YYYY`;
- ricostruire manualmente il foglio `Generale`;
- bloccare di nuovo l'app.

## Classificazione AI

Gemini e opzionale:

```env
GEMINI_API_KEY=
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
AI_CLASSIFICATION_ENABLED=true
AI_CLASSIFICATION_COMPARE=false
```

Se la AI non e configurata o fallisce, Spendino usa sempre la categorizzazione locale rule-based.
La API key vive solo lato server. Alla AI vengono inviati solo input originale, descrizione, importo e data della nuova spesa, non lo storico completo.

## PWA

Spendino e installabile su smartphone. In produzione deve essere servita via HTTPS.

Il service worker viene registrato solo in produzione: la shell puo aprirsi offline, mentre lettura, salvataggio, modifica e cancellazione richiedono il backend.

## Script

- `pnpm dev`: avvia sviluppo
- `pnpm build`: crea build produzione
- `pnpm start`: avvia build produzione
- `pnpm typecheck`: controlla TypeScript
- `pnpm test`: esegue tutta la suite
- `pnpm test:parser`: parser, date naturali e importi vocali
- `pnpm test:classifier`: categorizzazione locale e AI mockata
- `pnpm test:expense-review`: regole di revisione
- `pnpm test:filters`: filtri storico
- `pnpm test:local-store`: fallback locale
- `pnpm test:auth`: PIN, token e rate limit
- `pnpm test:archive`: archiviazione storica e riepilogo
- `pnpm test:api`: API spese, export e diagnostica

## Release 1.0.0

Questa release e pronta per uso personale stabile.
Prima del deploy definitivo su Google Sheets reale, esegui una prova manuale con:

- aggiunta spesa anno corrente;
- aggiunta spesa anno passato;
- modifica spesa cambiando anno;
- cancellazione da storico;
- `Ricostruisci Generale`;
- export CSV corrente e backup completo.
