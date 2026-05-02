# plan.md — Expense Tracker PWA

## 1. Visione del progetto

L'obiettivo è sviluppare una **Progressive Web App (PWA)** semplice, veloce e mobile-first per tracciare le spese quotidiane e ricorrenti.

L'utente deve poter inserire una spesa tramite:

- input testuale, ad esempio: `12,50 euro pranzo al bar`
- input vocale/audio, trascritto in testo

L'app deve poi:

1. interpretare la spesa;
2. estrarre importo, descrizione, data e categoria;
3. salvare la spesa in uno spreadsheet;
4. mostrare uno storico consultabile da smartphone.

Il progetto deve essere pensato per essere guidato e sviluppato con **Codex di OpenAI**, quindi ogni scelta tecnica deve essere chiara, incrementale e documentata.

---

## 2. Stack tecnologico consigliato

### Framework

Usare **Next.js** come framework principale.

Motivi:

- ottimo supporto a React;
- routing semplice tramite App Router;
- API routes/server actions utili per integrare servizi esterni;
- facile deploy su Vercel;
- buona compatibilità con PWA tramite configurazione dedicata;
- adatto sia a prototipi sia a evoluzioni future.

### Linguaggio

Usare **TypeScript**.

Motivi:

- riduce errori in fase di sviluppo;
- rende più chiari i contratti dati;
- aiuta Codex a generare codice più coerente.

### Styling

Usare **Tailwind CSS**.

Motivi:

- rapido per UI mobile-first;
- evita file CSS troppo complessi;
- facile da leggere e modificare.

### PWA

La web app deve essere installabile su smartphone.

Requisiti PWA:

- manifest Next.js configurato in `app/manifest.ts` e servito come `/manifest.webmanifest`;
- icone app;
- service worker;
- supporto offline almeno per la shell dell'app;
- layout responsive mobile-first;
- HTTPS in ambiente di produzione.

### Storage/spreadsheet

Per la prima versione usare **Google Sheets** come backend dati.

Possibili approcci:

1. **Google Sheets API** tramite API route Next.js;
2. eventuale integrazione futura con database come Supabase, Firebase o PostgreSQL.

Per MVP, Google Sheets è sufficiente perché:

- è leggibile anche fuori dall'app;
- è facile da esportare;
- consente validazione manuale dei dati;
- riduce complessità iniziale.

---

## 3. Obiettivo MVP

La prima versione deve essere molto semplice.

### Funzionalità incluse nell'MVP

- Inserimento spesa via testo.
- Parsing del testo per estrarre:
  - importo;
  - descrizione;
  - categoria;
  - data;
  - eventuale nota.
- Salvataggio della spesa su Google Sheets.
- Lista delle ultime spese registrate.
- Totale giornaliero e mensile.
- UI ottimizzata per smartphone.
- Installabilità come PWA.
- Protezione leggera con PIN personale persistente sul dispositivo.

### Funzionalità opzionali dopo MVP

- Inserimento vocale/audio.
- Trascrizione audio tramite Web Speech API o API esterna.
- Categorie personalizzabili.
- Spese ricorrenti.
- Grafici mensili.
- Budget per categoria.
- Esportazione CSV.
- Autenticazione utente.

---

## 4. User stories principali

### US-001 — Inserimento testuale spesa

Come utente, voglio scrivere una frase naturale come:

```text
Ho speso 18 euro per la cena ieri sera
```

così che l'app capisca automaticamente importo, categoria e data.

### US-002 — Salvataggio su spreadsheet

Come utente, voglio che ogni spesa venga salvata in uno spreadsheet, così posso consultare, modificare o esportare i dati anche fuori dall'app.

### US-003 — Visualizzazione ultime spese

Come utente, voglio vedere le ultime spese registrate, così posso controllare rapidamente se ho inserito tutto correttamente.

### US-004 — Uso da smartphone

Come utente, voglio installare l'app sul telefono e usarla come se fosse un'app nativa.

### US-005 — Inserimento vocale futuro

Come utente, voglio poter dettare una spesa a voce, così posso registrarla velocemente mentre sono in giro.

---

## 5. Modello dati

Ogni spesa deve essere rappresentata con una struttura simile:

```ts
export type Expense = {
  id: string;
  amount: number;
  currency: 'EUR';
  description: string;
  category: ExpenseCategory;
  date: string; // ISO date: YYYY-MM-DD
  rawInput: string;
  source: 'text' | 'voice';
  createdAt: string; // ISO datetime
  notes?: string;
};
```

Categorie iniziali:

```ts
export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'home'
  | 'health'
  | 'entertainment'
  | 'shopping'
  | 'subscriptions'
  | 'travel'
  | 'other';
```

Nel foglio Google Sheets, usare colonne:

```text
id | date | amount | currency | category | description | rawInput | source | createdAt | notes
```

---

## 6. Strategia di categorizzazione

Per l'MVP usare una categorizzazione semplice rule-based.

Esempi:

- parole come `bar`, `ristorante`, `cena`, `pranzo`, `pizza` → `food`
- parole come `supermercato`, `spesa`, `esselunga`, `conad`, `coop` → `groceries`
- parole come `benzina`, `treno`, `bus`, `taxi`, `parcheggio` → `transport`
- parole come `netflix`, `spotify`, `abbonamento` → `subscriptions`
- parole come `farmacia`, `medico`, `visita` → `health`

Creare un modulo dedicato:

```text
src/lib/categorizeExpense.ts
```

La logica deve essere facilmente sostituibile in futuro con classificazione AI.

---

## 7. Parsing dell'input

Per la prima versione, implementare un parser locale semplice.

Deve riconoscere input come:

```text
12 euro pranzo
12,50 pranzo al bar
ho speso 35€ di benzina ieri
9.99 netflix
50 euro supermercato oggi
```

Il parser deve:

1. identificare il primo importo presente;
2. normalizzare virgola e punto decimale;
3. rilevare parole temporali come `oggi`, `ieri`, `lunedì`, se possibile;
4. usare la data corrente come fallback;
5. passare la descrizione alla funzione di categorizzazione.

Creare un modulo dedicato:

```text
src/lib/parseExpenseInput.ts
```

---

## 8. Architettura proposta

Struttura iniziale del progetto:

```text
expense-pwa/
  app/
    page.tsx
    layout.tsx
    manifest.ts
    api/
      expenses/
        route.ts
  public/
    icons/
      icon-192.png
      icon-512.png
  src/
    components/
      ExpenseInput.tsx
      ExpenseList.tsx
      ExpenseSummary.tsx
    lib/
      parseExpenseInput.ts
      categorizeExpense.ts
      googleSheets.ts
      dates.ts
    types/
      expense.ts
  .env.local.example
  next.config.ts
  package.json
  README.md
  plan.md
```

---

## 9. API interne

Creare una API route Next.js:

```text
POST /api/expenses
```

Responsabilità:

- ricevere `rawInput` e `source`;
- validare l'input;
- chiamare il parser;
- salvare la spesa su Google Sheets;
- restituire la spesa normalizzata.

Payload esempio:

```json
{
  "rawInput": "12,50 pranzo al bar",
  "source": "text"
}
```

Response esempio:

```json
{
  "id": "exp_123",
  "amount": 12.5,
  "currency": "EUR",
  "description": "pranzo al bar",
  "category": "food",
  "date": "2026-05-01",
  "rawInput": "12,50 pranzo al bar",
  "source": "text",
  "createdAt": "2026-05-01T15:30:00.000Z"
}
```

Creare anche:

```text
GET /api/expenses
```

Responsabilità:

- leggere le ultime spese dallo spreadsheet;
- restituire una lista ordinata per data/creazione decrescente.

---

## 10. Integrazione Google Sheets

Creare un modulo:

```text
src/lib/googleSheets.ts
```

Responsabilità:

- autenticarsi con Google Sheets API;
- aggiungere una riga;
- leggere le ultime righe;
- mappare righe spreadsheet ↔ oggetti `Expense`.

Variabili ambiente previste:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_SHEET_NAME=Expenses
```

Non committare mai `.env.local`.

Creare invece:

```text
.env.local.example
```

---

## 11. UI mobile-first

La schermata principale deve contenere:

1. Header con nome app.
2. Campo input testuale grande e comodo.
3. Pulsante `Aggiungi spesa`.
4. Feedback di successo/errore.
5. Riepilogo:
   - totale oggi;
   - totale mese corrente.
6. Lista ultime spese.

Principi UI:

- layout verticale;
- bottoni grandi;
- poco testo;
- visibile bene con una mano;
- tema chiaro iniziale;
- evitare complessità non necessaria.

Nome provvisorio app:

```text
Spendino
```

---

## 12. Requisiti PWA

Configurare:

- manifest Next.js con nome app, id, scope, icone maskable e colori;
- service worker;
- caching della shell dell'app e degli asset statici;
- meta tag mobile;
- tema colore;
- comportamento standalone.

### Protezione personale

La PWA usa un PIN statico configurabile con `APP_PIN`.
Dopo lo sblocco corretto, un cookie persistente firmato mantiene autorizzato il dispositivo personale per circa 180 giorni.
Questa protezione e pensata per uso personale e non sostituisce autenticazione multiutente.

### Setup Google Sheets

Quando le credenziali Google sono configurate, l'app verifica il file prima di leggere o scrivere.
Se la tab manca, viene creata con le intestazioni richieste.
Se `GOOGLE_SHEETS_SPREADSHEET_ID` manca o punta a un file non trovato, l'app crea un nuovo Google Sheet e logga lo `spreadsheetId` da salvare nelle variabili ambiente.
Se `GOOGLE_SHEETS_SHARE_WITH_EMAIL` e configurata, l'app prova a condividere il nuovo file con quella email tramite Google Drive API.

### Impostazioni

Il tab `Impost.` raccoglie controlli personali:

- diagnostica manuale dello storage;
- export CSV;
- blocco app sul dispositivo.

Le API personali sono protette da cookie PIN e controllo origine per le richieste mutating.

Manifest indicativo:

```json
{
  "name": "Spendino",
  "short_name": "Spendino",
  "description": "Traccia le tue spese quotidiane in modo rapido",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#111827",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 13. Sviluppo incrementale consigliato per Codex

Procedere per step piccoli.

### Step 1 — Setup progetto

Prompt per Codex:

```text
Crea un progetto Next.js con TypeScript, App Router e Tailwind CSS per una PWA chiamata Spendino. Imposta una struttura pulita con cartelle app, src/components, src/lib e src/types. Non implementare ancora Google Sheets.
```

### Step 2 — Modello dati e parser

Prompt per Codex:

```text
Implementa il type Expense e ExpenseCategory. Crea parseExpenseInput.ts che prende una stringa in italiano e restituisce un oggetto Expense parziale con amount, description, category, date, rawInput e source. Gestisci importi con virgola o punto decimale.
```

### Step 3 — UI locale

Prompt per Codex:

```text
Crea una pagina principale mobile-first con input testuale, bottone aggiungi spesa, lista ultime spese e riepilogo totale oggi/mese. Per ora salva le spese in stato locale React.
```

### Step 4 — API route

Prompt per Codex:

```text
Crea POST /api/expenses e GET /api/expenses. Inizialmente usa un mock storage in memoria o file locale solo per sviluppo. Mantieni separata la logica di parsing e storage.
```

### Step 5 — Google Sheets

Prompt per Codex:

```text
Integra Google Sheets API in src/lib/googleSheets.ts usando variabili ambiente. Implementa appendExpense e listExpenses. Aggiorna le API route per usare Google Sheets come storage.
```

### Step 6 — PWA

Prompt per Codex:

```text
Configura la web app come PWA installabile. Aggiungi manifest, icone placeholder, service worker e meta tag necessari. Verifica che funzioni in modalità standalone da smartphone.
```

### Step 7 — Voice input

Prompt per Codex:

```text
Aggiungi input vocale opzionale tramite Web Speech API quando disponibile. Il risultato trascritto deve compilare il campo testuale prima dell'invio. Prevedi fallback se il browser non supporta la feature.
```

---

## 14. Regole di sviluppo

- Preferire codice semplice e leggibile.
- Non introdurre database finché Google Sheets è sufficiente.
- Non introdurre autenticazione nell'MVP, salvo necessità reale.
- Separare sempre UI, parsing, categorizzazione e storage.
- Scrivere funzioni pure dove possibile.
- Gestire errori in modo esplicito.
- Non salvare segreti nel repository.
- Ogni feature deve essere testabile manualmente da smartphone.

---

## 15. Criteri di accettazione MVP

L'MVP è completato quando:

- l'app si apre correttamente da smartphone;
- l'utente può inserire `12,50 pranzo al bar`;
- l'app salva una riga sullo spreadsheet;
- la spesa viene categorizzata come `food`;
- la lista mostra la spesa appena inserita;
- il totale giornaliero e mensile si aggiornano;
- l'app è installabile come PWA;
- non ci sono segreti hardcoded nel codice.

---

## 16. Possibile roadmap futura

### Versione 0.2

- Input vocale.
- Miglior parsing date.
- Editing/cancellazione spese.
- Filtri per categoria.

### Versione 0.3

- Dashboard mensile.
- Grafici per categoria.
- Budget mensili.
- Esportazione CSV.

### Versione 0.4

- Classificazione AI opzionale.
- Riconoscimento spese ricorrenti.
- Notifiche reminder.

### Versione 1.0

- Autenticazione.
- Multi-device.
- Backup cloud più robusto.
- Eventuale migrazione da Google Sheets a database.

---

## 17. Nota importante per Codex

Quando generi codice per questo progetto:

1. mantieni il progetto minimalista;
2. evita overengineering;
3. spiega eventuali trade-off tecnici;
4. preferisci implementazioni funzionanti end-to-end;
5. non introdurre librerie non necessarie;
6. mantieni la UX pensata prima di tutto per smartphone;
7. considera l'app come PWA fin dall'inizio.
