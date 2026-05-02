# Spendino - Architecture

Questo file descrive l'architettura tecnica corrente di Spendino.
Ogni nuova modifica strutturale deve aggiornare questo documento insieme al codice.

## Stack

- Framework: Next.js con App Router.
- Linguaggio: TypeScript.
- UI: React.
- Styling: Tailwind CSS.
- Package manager dichiarato: pnpm.
- PWA: manifest Next.js, icone in `public/icons`, service worker statico in `public/sw.js`.
- Protezione personale: PIN statico configurabile, cookie httpOnly persistente e middleware sulle API spese.
- Storage primario MVP: Google Sheets.
- Storage fallback sviluppo: file locale `data/expenses.json`.
- AI provider previsto: Google Gemini API.
- Modello AI previsto: `gemini-2.5-flash-lite`.

## Struttura

```text
app/
  api/
    auth/
      lock/
        route.ts
      status/
        route.ts
      unlock/
        route.ts
    expenses/
      export/
        route.ts
      route.ts
    storage/
      diagnostics/
        route.ts
  globals.css
  layout.tsx
  manifest.ts
  page.tsx
public/
  icons/
    icon-192.png
    icon-512.png
  sw.js
src/
  components/
    ExpenseFilters.tsx
    ExpenseInput.tsx
    ExpenseList.tsx
    ExpenseReviewPanel.tsx
    ExpenseSummary.tsx
    ServiceWorkerRegistration.tsx
    SpendinoApp.tsx
  lib/
    appAuth.ts
    categorizeExpense.ts
    categoryMeta.ts
    classifyExpense.ts
    dates.ts
    expenseReview.ts
    filterExpenses.ts
    geminiClassifier.ts
    googleSheets.ts
    localExpenseStore.ts
    parseExpenseInput.ts
  types/
    expense.ts
```

## Flusso Applicativo

1. L'utente sblocca Spendino con il PIN se il dispositivo non ha ancora un cookie valido.
2. L'utente usa il tab `Aggiungi` per inserire una frase nella UI, oppure per dettarla tramite input vocale quando il browser lo supporta.
3. Se l'input e vocale, `ExpenseInput` salva automaticamente appena riceve la trascrizione finale.
4. `SpendinoApp` invia `rawInput` e `source` a `POST /api/expenses`.
5. Il middleware verifica che il cookie di sblocco PIN sia valido per le API spese.
   Per richieste mutating controlla anche che l'origine sia quella dell'app o `APP_ALLOWED_ORIGIN`.
6. L'API valida il payload.
7. L'API chiama `parseExpenseInput`.
8. Il parser estrae importo, descrizione e data.
9. Il sistema classifica la spesa:
   - usa Gemini 2.5 Flash-Lite se la classificazione AI e abilitata e configurata;
   - usa `categorizeExpense` rule-based come fallback obbligatorio.
10. L'API salva la spesa tramite `appendExpense`.
11. `appendExpense` prepara Google Sheets se configurato, altrimenti usa il fallback locale.
12. L'API restituisce la spesa normalizzata.
13. La UI aggiorna riepiloghi, estratto recente e tab `Storico`.

## Navigazione UI

`SpendinoApp` gestisce una navigazione client-side a tab:

- `Aggiungi`: flusso principale per input testuale/vocale, feedback, revisione e riepilogo essenziale;
- `Storico`: lista completa delle spese salvate, filtri, totale filtrato, raggruppamento per data e cancellazione.
- `Impost.`: stato storage, diagnostica manuale, export CSV e blocco app.

Il tab attivo vive in stato React locale.
Per ora non viene persistito su reload, cosi l'app riparte sempre dal flusso di inserimento rapido.

## API

### GET `/api/expenses`

Responsabilita:

- leggere le ultime spese;
- restituirle ordinate per `createdAt` decrescente;
- usare Google Sheets o fallback locale in base alla configurazione.
- richiedere cookie di sblocco PIN valido.

Risposta:

```json
{
  "expenses": []
}
```

### POST `/api/expenses`

Payload:

```json
{
  "rawInput": "12,50 pranzo al bar",
  "source": "text"
}
```

Responsabilita:

- validare `rawInput`;
- normalizzare `source`;
- creare una spesa tramite parser e classifier;
- salvare la spesa;
- restituire la spesa creata.
- richiedere cookie di sblocco PIN valido.

Errori:

- `400` per payload non valido, input vuoto o importo non riconosciuto;
- `500` per errori inattesi in lettura o scrittura.

### POST `/api/expenses/preview`

Responsabilita:

- ricevere `rawInput` e `source`;
- eseguire parsing e classificazione senza salvare;
- restituire la spesa interpretata;
- indicare se serve revisione prima del salvataggio;
- indicare se la categoria suggerita arriva da AI o da regole locali.

### DELETE `/api/expenses/[id]`

Responsabilita:

- ricevere l'`id` della spesa da cancellare;
- cancellare la spesa dallo storage configurato;
- restituire esito positivo solo dopo cancellazione confermata;
- restituire `404` se la spesa non esiste;
- restituire `500` per errori inattesi in cancellazione.
- richiedere cookie di sblocco PIN valido.

La modifica delle spese salvate non e prevista in questa fase.

### GET `/api/expenses/export`

Responsabilita:

- leggere le spese dallo storage configurato;
- restituire un file CSV scaricabile;
- richiedere cookie di sblocco PIN valido.

### GET `/api/auth/status`

Controlla se il cookie di sblocco PIN e valido.

Risposta:

```json
{
  "unlocked": true
}
```

### POST `/api/auth/unlock`

Payload:

```json
{
  "pin": "1234"
}
```

Responsabilita:

- confrontare il PIN ricevuto con `APP_PIN`;
- creare un cookie httpOnly firmato valido per circa 180 giorni;
- restituire `401` se il PIN e errato.

### POST `/api/auth/lock`

Cancella il cookie di sblocco.
Viene usato dal tab `Impost.` per bloccare manualmente l'app.

### GET `/api/storage/diagnostics`

Restituisce una vista non distruttiva della configurazione storage corrente.
Non chiama Google e non crea file.

### POST `/api/storage/diagnostics`

Esegue la diagnostica reale dello storage configurato.
Se Google Sheets e configurato, puo creare file, tab e intestazioni mancanti.
Richiede cookie di sblocco PIN valido.

## Componenti UI

### `SpendinoApp`

Componente client principale.
Gestisce:

- controllo dello stato di sblocco PIN;
- schermata di sblocco prima dell'app;
- tab mobile `Aggiungi` e `Storico`;
- tab `Impost.` con diagnostica, export e blocco app;
- caricamento iniziale delle spese;
- submit di una nuova spesa;
- stato di caricamento;
- stato di salvataggio;
- feedback successo/errore;
- filtro e totale filtrato nello storico;
- cancellazione spesa salvata;
- composizione della schermata mobile.

### `ExpenseInput`

Form testuale.
Gestisce anche l'input vocale lato browser tramite Web Speech API.
Non contiene logica di parsing o storage.

Responsabilita:

- mantenere il testo corrente;
- avviare o fermare la dettatura quando disponibile;
- compilare `rawInput` con la trascrizione;
- salvare automaticamente quando la Web Speech API produce una trascrizione finale;
- distinguere `source: "text"` e `source: "voice"`;
- mostrare stato vocale e fallback quando il browser non supporta la feature.

### `ExpenseSummary`

Mostra:

- totale del giorno corrente;
- totale del mese corrente.

Usa funzioni data condivise da `src/lib/dates.ts`.
Nel tab `Aggiungi` usa tutte le spese, non le spese filtrate, per mantenere un riepilogo personale stabile.

### `ExpenseFilters`

Componente controllato e mobile-friendly per filtrare lo storico.
Gestisce solo UI e callback, non modifica storage.

Filtri:

- periodo rapido: tutto, oggi, settimana, mese;
- periodo personalizzato;
- ricerca testuale su descrizione, input originale e note;
- categoria con chip orizzontali;
- sorgente input;
- reset dei filtri attivi.

### `ExpenseReviewPanel`

Pannello client mostrato solo quando la preview richiede revisione.
Permette di correggere:

- importo;
- data;
- descrizione;
- categoria.

Conserva sempre `rawInput` originale e aggiunge note se l'utente modifica valori interpretati.

### `ExpenseList`

Mostra le spese recenti con:

- descrizione;
- data;
- categoria;
- importo.
- sorgente input, testo o voce.

Usa `src/lib/categoryMeta.ts` per label, marker visivo e colori categoria.
Espone un'azione elimina per ogni spesa e lascia al componente padre la gestione di conferma, chiamata API e aggiornamento stato.
La cancellazione usa conferma browser e stato di cancellazione per riga.
Quando riceve una lista vuota con filtri attivi, mostra un messaggio vuoto specifico.
Supporta il raggruppamento per data, usato nel tab `Storico` per migliorare la scansione mobile.

### `ServiceWorkerRegistration`

Registra `/sw.js` solo in produzione e solo se il browser supporta i service worker.

## Moduli di Dominio

### `src/types/expense.ts`

Definisce:

- `Expense`;
- `ExpenseCategory`;
- `ExpenseSource`.

Qualsiasi modifica al modello dati deve partire da qui e aggiornare anche `requirements.md`.

### `src/lib/parseExpenseInput.ts`

Funzione pura principale per trasformare testo libero in `Expense`.

Responsabilita:

- trovare gli importi nella frase;
- scegliere l'importo principale, preferendo quello con valuta esplicita;
- normalizzare decimali;
- costruire una descrizione leggibile;
- risolvere la data naturale;
- generare `id` e `createdAt`.
- aggiungere una nota quando la frase contiene piu importi.

Non deve sapere nulla di React, API route o storage.
Quando la categorizzazione AI viene implementata, il parser deve restare concentrato su importo, descrizione e data; la classificazione puo essere delegata a un modulo dedicato perche puo diventare asincrona.

### `src/lib/categorizeExpense.ts`

Contiene regole keyword-based per assegnare una categoria.
Deve restare piccolo e sostituibile.
Rimane il fallback obbligatorio quando l'AI non e configurata o fallisce.

### `src/lib/categoryMeta.ts`

Centralizza metadati visuali delle categorie:

- label italiana;
- marker breve;
- descrizione;
- classi colore.

La UI deve usare questo modulo quando mostra categorie, evitando duplicazioni locali.

### `src/lib/classifyExpense.ts`

Facade per la categorizzazione.
Responsabilita:

- ricevere i dati minimi della spesa da classificare;
- decidere se usare AI o regole locali;
- validare che la categoria restituita sia tra quelle supportate;
- tornare sempre una categoria valida;
- isolare la UI e le API dai dettagli del provider AI.
- non salvare la confidence nel modello dati corrente.

### `src/lib/geminiClassifier.ts`

Integrazione con Google Gemini API via REST.
Responsabilita:

- chiamare Gemini 2.5 Flash-Lite solo lato server;
- inviare solo input originale, descrizione, importo e data;
- chiedere una risposta JSON vincolata alle categorie supportate;
- non inviare lo storico completo delle spese;
- non esporre mai `GEMINI_API_KEY` al browser;
- fallire in modo controllato lasciando il fallback rule-based a `classifyExpense`.

Usa l'endpoint REST `models/{model}:generateContent` e header `x-goog-api-key`.

### `src/lib/dates.ts`

Contiene funzioni condivise per:

- conversione `Date` -> `YYYY-MM-DD`;
- normalizzazione testo italiano;
- interpretazione date naturali semplici, inclusi `ieri`, `domani`, giorni della settimana, `settimana scorsa` e `fine mese`;
- confronto con mese corrente.

### `src/lib/filterExpenses.ts`

Contiene logica pura per filtrare spese gia caricate.
Responsabilita:

- definire il contratto `ExpenseFilters`;
- filtrare per testo, categoria, sorgente input e periodo;
- supportare periodi rapidi e range personalizzato;
- normalizzare la ricerca testuale ignorando maiuscole e accenti;
- indicare se esistono filtri attivi.

### `src/lib/expenseReview.ts`

Contiene la logica pura per decidere se una spesa interpretata richiede revisione.
Attualmente richiede revisione per:

- categoria `other`;
- descrizione debole;
- input con importi multipli.

### `src/lib/appAuth.ts`

Contiene la logica server-side per la protezione PIN.

Responsabilita:

- leggere `APP_PIN`, con default locale `1234`;
- firmare un token di sblocco tramite HMAC;
- verificare il cookie persistente usato dal middleware;
- mantenere la durata dello sblocco a circa 180 giorni.

## Test

### `pnpm test:parser`

Esegue `tests/parseExpenseInput.test.mjs`.
Il test usa il runner Node diretto con type stripping sperimentale, senza dipendenze aggiuntive.
Copre:

- frasi naturali in italiano;
- date naturali;
- importi multipli;
- categorizzazione indiretta;
- errore quando manca l'importo.

### `pnpm test:classifier`

Esegue `tests/classifyExpense.test.mjs`.
Copre:

- categorizzazione rule-based;
- fallback quando AI e disabilitata;
- fallback quando AI e abilitata ma manca la API key.

### `pnpm test:filters`

Esegue `tests/filterExpenses.test.mjs`.
Copre:

- filtri attivi;
- categoria e sorgente;
- oggi, settimana corrente e mese corrente;
- periodo personalizzato;
- ricerca testuale su descrizione, raw input e note.

### `pnpm test:expense-review`

Esegue `tests/expenseReview.test.mjs`.
Copre:

- spese chiare senza revisione;
- categoria incerta, descrizione debole e importi multipli.

### `pnpm test:categories`

Esegue `tests/categoryMeta.test.mjs`.
Copre:

- completezza metadati per ogni categoria;
- presenza esplicita del fallback `other`.

### `pnpm test:auth`

Esegue `tests/appAuth.test.mjs`.
Copre:

- validazione del PIN statico;
- creazione e verifica del token firmato di sblocco;
- rifiuto di token assente o alterato.

### `src/lib/googleSheets.ts`

Facade dello storage spese.

Responsabilita:

- decidere se usare Google Sheets o fallback locale;
- esporre informazioni non distruttive sullo storage configurato;
- eseguire diagnostica storage manuale;
- autenticarsi con service account Google quando configurato;
- creare un nuovo spreadsheet se le credenziali sono presenti ma manca uno spreadsheet id o quello configurato non esiste;
- condividere un nuovo spreadsheet con `GOOGLE_SHEETS_SHARE_WITH_EMAIL` quando configurata e quando Google Drive API e abilitata;
- creare la tab configurata se manca;
- preparare la riga intestazione richiesta;
- appendere una riga al foglio;
- cancellare una riga esistente tramite `id`;
- leggere righe dal foglio;
- mappare righe Google Sheets in `Expense`.

Nota: non usa librerie Google esterne; crea un JWT con Web Crypto per ridurre dipendenze.

### `src/lib/localExpenseStore.ts`

Storage locale solo per sviluppo.
Scrive e legge `data/expenses.json`.
Rimuove una spesa per `id` e riscrive il file senza alterare le altre righe.
Non deve essere considerato backend di produzione.

## PWA

### Manifest

Definito in `app/manifest.ts`.
Espone:

- nome app;
- descrizione;
- id, scope, lingua e orientamento portrait;
- start URL;
- display standalone;
- colori;
- icone 192x192 e 512x512 con purpose `any maskable`.

### Service Worker

Definito in `public/sw.js`.
Implementa:

- caching base della shell;
- pulizia cache obsolete;
- fallback offline per navigazioni verso la shell;
- cache runtime per asset statici Next.js, manifest e icone;
- risposta JSON `503` per API GET quando il dispositivo e offline.

### Icone

Le icone sono placeholder PNG:

```text
public/icons/icon-192.png
public/icons/icon-512.png
```

## Storage

### Google Sheets configurato

Se queste variabili sono presenti:

```env
GOOGLE_SHEETS_CLIENT_EMAIL
GOOGLE_SHEETS_PRIVATE_KEY
```

allora `googleSheets.ts` usa Google Sheets API.
`GOOGLE_SHEETS_SPREADSHEET_ID` e consigliato per produzione, ma non obbligatorio: se manca, l'app crea un nuovo file Google Sheet e logga l'id da salvare in configurazione.
`GOOGLE_SHEETS_SHEET_NAME` controlla il nome tab, con default `Expenses`.
`GOOGLE_SHEETS_SPREADSHEET_TITLE` controlla il titolo di un nuovo file creato automaticamente.
`GOOGLE_SHEETS_SHARE_WITH_EMAIL` permette di condividere automaticamente un nuovo file con l'email personale, se Google Drive API e abilitata.

### Google Sheets non configurato

Se mancano `GOOGLE_SHEETS_CLIENT_EMAIL` o `GOOGLE_SHEETS_PRIVATE_KEY`, l'app usa:

```text
data/expenses.json
```

Questo permette sviluppo e test manuali senza credenziali.

## AI Classification

La classificazione AI approvata usa Google Gemini API con modello `gemini-2.5-flash-lite`.
La feature deve essere opzionale e controllata da variabili ambiente:

```env
GEMINI_API_KEY
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
AI_CLASSIFICATION_ENABLED=true
AI_CLASSIFICATION_COMPARE=false
```

La API key Gemini vive solo lato server:

- in locale dentro `.env.local`;
- in produzione nelle variabili ambiente del provider di deploy, ad esempio Vercel.

L'account Google usato per generare la API key non deve coincidere con l'account usato sul telefono.
La PWA installata su smartphone non chiama Gemini direttamente e non conosce la API key; invia richieste al backend di Spendino.

### Flusso AI previsto

1. Il parser locale estrae importo, descrizione e data.
2. `classifyExpense` controlla `AI_CLASSIFICATION_ENABLED`.
3. Se AI e attiva e `GEMINI_API_KEY` e presente, chiama `geminiClassifier`.
4. `geminiClassifier` invia a Gemini solo i dati minimi necessari.
5. La risposta viene validata contro `ExpenseCategory`.
6. Se la risposta e valida, viene usata come categoria.
7. Se la risposta non e valida o la chiamata fallisce, viene usato `categorizeExpense`.

La classificazione AI non cambia il contratto dell'API: `POST /api/expenses` restituisce sempre una normale `Expense`.

### Modalita confronto

Se `AI_CLASSIFICATION_COMPARE=true`, `classifyExpense` scrive nei log server:

- categoria rule-based;
- categoria Gemini;
- confidence Gemini, se presente;
- esito match/mismatch.

Il log non include raw input, storico spese o API key.
Questa modalita serve solo a valutare la qualita della classificazione durante lo sviluppo.

### Privacy AI

Per la sola categorizzazione di una nuova spesa non va inviato a Gemini lo storico completo.
Nel free tier di Google AI Studio il contenuto puo essere usato da Google per migliorare i prodotti; questa scelta e accettabile per prototipo e uso personale iniziale, ma va rivalutata prima di un uso piu sensibile o condiviso.

## Convenzioni

- UI, parsing, categorizzazione e storage devono restare separati.
- Le API personali devono essere protette dal cookie PIN e, per richieste mutating, da controllo origine.
- La UI non deve contenere regole di parsing.
- L'input vocale deve restare una feature client-side, salvare automaticamente al risultato finale e riusare lo stesso endpoint di salvataggio dell'input testuale.
- Le API route non devono contenere dettagli di rendering.
- Le funzioni pure devono essere preferite per logica di dominio.
- Le chiamate AI devono stare solo lato server.
- La categorizzazione AI deve avere sempre fallback rule-based.
- I segreti devono stare solo in `.env.local`, mai nel repository.
- Le nuove dipendenze vanno introdotte solo quando semplificano davvero il progetto.
- Ogni feature mobile deve essere pensata prima per schermi stretti.

## Come Aggiornare Questi Documenti

Quando cambia una funzionalita:

- aggiornare `requirements.md` con il nuovo comportamento atteso;
- aggiornare questo file se cambia il flusso, lo storage, il modello dati, le API o la struttura file;
- mantenere esempi e contratti coerenti con il codice;
- se una decisione temporanea viene superata, rimuoverla o marcarla come storica.
