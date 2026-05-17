# Spendino - Requirements

Questo file e la fonte di verita per i requisiti funzionali e di prodotto di Spendino.
Ogni nuova richiesta deve aggiornare questo documento quando cambia cosa l'app deve fare, cosa e considerato MVP, oppure quali comportamenti sono accettati.

## Visione

Spendino e una Progressive Web App mobile-first per tracciare rapidamente le spese quotidiane.
L'utente inserisce una frase naturale, l'app interpreta la spesa, la salva e mostra storico e riepiloghi essenziali.

## Utenti e contesto d'uso

- L'app e pensata per uso personale da smartphone.
- L'inserimento deve essere veloce, leggibile e comodo con una mano.
- L'utente deve poter verificare subito se una spesa e stata registrata correttamente.
- Google Sheets resta il backend dati preferito per l'MVP, perche consente controllo manuale ed esportazione semplice.

## MVP Corrente

### Incluso

- Inserimento spesa tramite testo libero.
- Parsing locale di frasi in italiano.
- Estrazione di:
  - importo;
  - descrizione;
  - categoria;
  - data;
  - input originale;
  - sorgente dell'input.
- Categorizzazione rule-based.
- Salvataggio tramite API interna.
- Salvataggio su Google Sheets quando le credenziali sono configurate.
- Fallback locale di sviluppo in `data/expenses.json` quando Google Sheets non e configurato.
- Lista delle ultime spese.
- Totale giornaliero.
- Totale del mese corrente.
- Totale anno corrente e media giornaliera del mese.
- Layout mobile-first.
- Configurazione PWA con manifest, icone e service worker.
- Protezione leggera con PIN personale persistente sul dispositivo.
- Input vocale opzionale tramite Web Speech API quando supportata dal browser.
- Cancellazione spese salvate.
- Modifica spese salvate dal tab `Storico`.
- Filtri per categoria, periodo, sorgente input e testo nello storico.
- Revisione prima del salvataggio quando il parsing e incerto.
- Tab impostazioni con diagnostica storage, export CSV corrente, backup CSV completo, ricostruzione `Generale` e blocco app.
- Archiviazione storica automatica su fogli annuali Google Sheets.

### Non incluso nell'MVP corrente

- Autenticazione.
- Multiutente.
- Grafici.
- Budget.
- Categorie personalizzabili.
- Spese ricorrenti.

## Evoluzione Approvata

Le prossime versioni devono evolvere l'app in due direzioni principali:

- restyling frontend pulito, accattivante e futuristico;
- input utente sia testuale sia vocale;
- categorizzazione della spesa assistita da AI, mantenendo sempre un fallback locale rule-based.

### Direzione UI

Il frontend deve essere migliorato come priorita alta.
La nuova interfaccia deve restare semplice e mobile-first, ma risultare piu curata, moderna e memorabile.

Linee guida:

- grafica pulita, accattivante e futuristica;
- layout non complesso, centrato sull'inserimento rapido della spesa;
- navigazione mobile a tab per separare inserimento e consultazione;
- tab `Aggiungi` dedicato a input rapido, voce, feedback e riepilogo essenziale;
- tab `Storico` dedicato a spese salvate, filtri, totale filtrato e cancellazione;
- buona leggibilita su smartphone;
- gerarchia chiara tra input, riepiloghi e storico;
- dettagli visuali moderni senza appesantire l'uso quotidiano;
- stati di caricamento, salvataggio, errore e successo visivamente coerenti;
- spazio gia pensato per il futuro input vocale.
- categorie mostrate con label, marker e colore coerenti tramite metadati centralizzati.

Il restyling non deve cambiare il comportamento funzionale dell'MVP, salvo piccoli miglioramenti di usabilita.

### Storico Mobile

Lo storico deve essere una vista separata dal flusso di inserimento.
La home di inserimento puo mostrare solo un estratto delle ultime spese, mentre la lista completa deve vivere nel tab `Storico`.

Lo storico deve:

- mostrare le spese operative correnti caricate da `Expenses`;
- raggruppare le spese per giorno quando utile alla lettura;
- mostrare il totale relativo ai filtri attivi;
- rendere i filtri apribili o comprimibili su smartphone;
- supportare filtri rapidi per tutto, oggi, settimana e mese;
- supportare filtro per categoria;
- supportare ricerca testuale per descrizione, input originale e note;
- permettere modifica e cancellazione di una spesa;
- permettere refresh manuale per rileggere lo storage operativo;
- mantenere la cancellazione disponibile ma non troppo facile da premere per errore.

### Categorizzazione AI

Il provider AI iniziale scelto e Google Gemini API con modello `gemini-2.5-flash-lite`.

Motivazioni:

- ha un free tier adatto a prototipazione e uso personale iniziale;
- e sufficientemente leggero per classificare frasi brevi;
- comprende bene l'italiano per task di categorizzazione semplice;
- ha costo molto basso se in futuro si passa a un tier paid;
- si integra facilmente lato server in Next.js.

La classificazione AI deve essere opzionale e controllata da configurazione.
Se l'AI non e configurata, non risponde, supera i limiti o restituisce una categoria non valida, l'app deve usare la categorizzazione rule-based esistente.

L'AI deve ricevere solo i dati necessari per classificare una nuova spesa:

- input originale;
- descrizione normalizzata;
- importo;
- data.

Non deve ricevere lo storico completo delle spese per la sola classificazione di una nuova spesa.

La risposta AI deve essere vincolata alle categorie supportate e preferibilmente normalizzata in JSON, ad esempio:

```json
{
  "category": "food",
  "confidence": 0.92
}
```

La `confidence` puo essere usata in futuro per mostrare conferme o revisioni, ma non deve modificare il modello dati finche non e realmente necessaria.
Nello stato corrente la confidence non viene salvata nel modello `Expense`.

### Credenziali AI

La API key Gemini deve essere usata solo lato server e non deve mai essere esposta nel frontend.
L'account Google usato per generare la API key puo essere diverso dall'account Google usato sul cellulare dove la PWA viene installata.
L'app installata sul cellulare usa il backend di Spendino, che a sua volta chiama Gemini con la API key configurata sul server.

Variabili ambiente previste per l'integrazione AI:

```env
GEMINI_API_KEY=
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
AI_CLASSIFICATION_ENABLED=true
AI_CLASSIFICATION_COMPARE=false
```

Per impostazione di esempio, `AI_CLASSIFICATION_ENABLED` resta `false` in `.env.local.example`.
Per attivare Gemini in locale o produzione servono `GEMINI_API_KEY`, `AI_PROVIDER=gemini`, `AI_MODEL=gemini-2.5-flash-lite` e `AI_CLASSIFICATION_ENABLED=true`.
`AI_CLASSIFICATION_COMPARE=true` abilita solo log server di confronto tra categoria locale e categoria AI durante lo sviluppo.

## User Stories

### US-001 - Inserimento testuale

Come utente, voglio scrivere una frase come `12,50 pranzo al bar`, cosi l'app registra automaticamente importo, descrizione, categoria e data.

### US-002 - Salvataggio persistente

Come utente, voglio che ogni spesa venga salvata in uno storage persistente, cosi posso recuperarla anche dopo aver chiuso l'app.

### US-003 - Storico recente

Come utente, voglio vedere le ultime spese registrate, cosi posso controllare rapidamente cosa ho inserito.

### US-004 - Riepilogo rapido

Come utente, voglio vedere totale di oggi, mese corrente, anno corrente e media giornaliera del mese, cosi capisco subito l'andamento delle mie spese.

### US-005 - Uso da smartphone

Come utente, voglio installare Spendino come PWA, cosi posso usarla come una normale app mobile.

### US-006 - Input vocale

Come utente, voglio dettare una spesa a voce, cosi posso registrarla rapidamente mentre sono in giro senza dover premere un secondo pulsante di salvataggio.

### US-006A - Fallback input vocale

Come utente, voglio che l'app resti usabile anche se il mio browser non supporta la dettatura, cosi posso sempre inserire la spesa via testo.

### US-007 - Categorizzazione AI opzionale

Come utente, voglio che l'app usi una AI per categorizzare meglio le mie spese, cosi devo correggere meno spesso la categoria.

### US-008 - Fallback senza AI

Come utente, voglio che l'app continui a funzionare anche se l'AI non e configurata o non risponde, cosi posso sempre registrare una spesa.

### US-009 - Interfaccia piu curata

Come utente, voglio un'interfaccia pulita, accattivante e futuristica, cosi l'app risulta piacevole da usare ogni giorno senza diventare complessa.

### US-010 - Cancellazione spesa

Come utente, voglio poter cancellare una spesa salvata, cosi posso rimuovere inserimenti sbagliati o duplicati.

### US-011 - Storico separato

Come utente, voglio consultare le spese vecchie in una sezione dedicata, cosi l'inserimento rapido resta semplice e lo storico resta facile da filtrare.

### US-011 - Revisione spesa incerta

Come utente, voglio controllare e correggere una spesa prima del salvataggio quando l'app non e sicura dell'interpretazione, cosi evito dati sbagliati nello storico.

### US-012 - Modifica spesa salvata

Come utente, voglio modificare una spesa vecchia dallo storico, cosi posso correggere importo, data, descrizione o categoria senza aprire Google Sheets.

### US-013 - Archiviazione automatica

Come utente, voglio che l'app tenga leggero il foglio operativo e archivi automaticamente gli anni passati, cosi posso usare Spendino per molti anni senza manutenzione manuale del codice.

### US-014 - Backup completo

Come utente, voglio esportare sia le spese correnti sia un backup completo con archivi, cosi posso conservare una copia indipendente dei dati.

## Regole di Parsing

Il parser deve:

- identificare il primo importo presente nella frase;
- accettare importi con virgola o punto decimale;
- accettare importi vocali semplici, ad esempio `dodici euro` e `dodici euro e cinquanta`;
- accettare importi sporchi frequenti come `12 50`;
- accettare simbolo euro o parole come `euro`, `eur`;
- preferire l'importo con valuta esplicita quando la frase contiene piu importi;
- rimuovere parole di riempimento comuni dalla descrizione;
- riconoscere date naturali come `oggi`, `ieri`, `l'altro ieri`, `due giorni fa`, `domani`, i giorni della settimana, `lunedi scorso`, `la settimana scorsa`, `settimana prossima`, `mese scorso`, riferimenti al weekend e `a fine mese`;
- riconoscere date esplicite come `primo maggio`, `primo di maggio`, `15 novembre 2025`, `01/05/2025`;
- non trattare parti di data come importi multipli;
- segnalare in revisione importi elevati, date future lontane e date multiple;
- usare la data corrente come fallback;
- generare un errore chiaro quando non trova un importo valido.

Input minimi da supportare:

```text
12 euro pranzo
12,50 pranzo al bar
ho speso 35 euro di benzina ieri
9.99 netflix
50 euro supermercato oggi
ho pagato 18 euro per una pizza ieri sera
35 euro benzina lunedi scorso
50 supermercato la settimana scorsa
9.99 netflix a fine mese
20€ pranzo primo maggio
dodici euro e cinquanta bar
12 euro e 50 centesimi caffe
20 pranzo 01/05/2025
```

## Categorie

Categorie supportate:

```text
food
groceries
transport
home
health
entertainment
shopping
subscriptions
travel
other
```

La categorizzazione corrente e rule-based.
La categorizzazione AI con Gemini 2.5 Flash-Lite e la direzione approvata per le prossime versioni, ma deve restare opzionale e sostituibile.
Le categorie restano quelle definite in questo documento; l'AI non puo introdurre categorie nuove senza una modifica esplicita del modello dati.
Ogni categoria deve avere metadati UI centralizzati: label italiana, marker breve, colore e descrizione.
La categoria `other` deve restare sempre disponibile come fallback.

## Modello Dati

Ogni spesa deve rispettare questo contratto:

```ts
export type Expense = {
  id: string;
  amount: number;
  currency: "EUR";
  description: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  rawInput: string;
  source: "text" | "voice";
  createdAt: string; // ISO datetime
  notes?: string;
};
```

## Google Sheets

Le righe di spesa devono usare queste colonne:

```text
id | date | amount | currency | category | description | rawInput | source | createdAt | notes
```

Variabili ambiente previste:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_SHEET_NAME=Expenses
GOOGLE_SHEETS_SPREADSHEET_TITLE=Spendino Expenses
GOOGLE_SHEETS_SHARE_WITH_EMAIL=
```

I segreti non devono mai essere salvati nel repository.

Quando le credenziali Google sono presenti, Spendino verifica il file prima delle operazioni di lettura, scrittura, modifica e cancellazione.
Se la tab configurata non esiste, viene creata automaticamente con le intestazioni richieste.
Se lo spreadsheet configurato non esiste, o se manca `GOOGLE_SHEETS_SPREADSHEET_ID`, l'app crea un nuovo file Google Sheet intestato a `GOOGLE_SHEETS_SPREADSHEET_TITLE` e ne scrive l'id nei log server.
Se `GOOGLE_SHEETS_SHARE_WITH_EMAIL` e configurata, l'app prova a condividere il nuovo file con quella email come editor usando Google Drive API.
In produzione il nuovo id deve essere copiato in `GOOGLE_SHEETS_SPREADSHEET_ID`, altrimenti non e garantito che resti stabile tra deploy o istanze serverless.

### Struttura storica Google Sheets

- `Expenses`: foglio operativo con anno corrente e spese future.
- `Archive_Detail_YYYY`: fogli annuali creati automaticamente per spese di anni passati.
- `Generale`: foglio riepilogo con una riga per anno e colonne mensili.

Una spesa con data passata deve essere salvata direttamente in `Archive_Detail_YYYY`.
Quando lo storico viene ricaricato, eventuali righe passate rimaste in `Expenses` devono essere archiviate automaticamente.
Modifica e cancellazione devono cercare la spesa per `id` anche negli archivi.
Se una modifica cambia anno di competenza, la spesa deve essere spostata nel foglio target corretto.

## Protezione PIN

Spendino supporta una protezione leggera tramite PIN statico per uso personale.

Requisiti:

- l'app mostra una schermata di sblocco prima dell'interfaccia principale;
- il PIN e configurato tramite `APP_PIN`, con default locale `1234`;
- dopo uno sblocco corretto, il dispositivo resta autorizzato tramite cookie persistente;
- il cookie di sblocco dura circa 180 giorni;
- le API delle spese rifiutano richieste senza cookie valido;
- le richieste mutating verso le API devono arrivare dalla stessa origine dell'app o da `APP_ALLOWED_ORIGIN`;
- i tentativi PIN falliti sono limitati con rate limit locale;
- il PIN statico non sostituisce una vera autenticazione multiutente.

Variabili ambiente previste:

```env
APP_PIN=1234
APP_AUTH_SECRET=
APP_ALLOWED_ORIGIN=
```

## Impostazioni e Diagnostica

L'app include un tab `Impost.` per controlli personali.

Funzioni:

- mostrare il tipo di storage in uso, locale o Google Sheets;
- mostrare stato foglio operativo, stato `Generale` e archivi annuali rilevati;
- lanciare una diagnostica manuale dello storage;
- esportare il CSV corrente;
- esportare un backup CSV completo con `Expenses + Archive_Detail_YYYY`;
- ricostruire manualmente il foglio `Generale`;
- bloccare di nuovo l'app cancellando il cookie di sblocco.

La diagnostica Google Sheets puo creare file o tab mancanti solo quando l'utente la avvia o quando una normale operazione di storage richiede preparazione.

## Modifica e Cancellazione Spese

La modifica e la cancellazione di una spesa salvata sono supportate dal tab `Storico`.

Requisiti:

- l'utente puo modificare importo, data, descrizione e categoria;
- `id`, `rawInput`, `source` e `createdAt` restano invariati;
- l'utente puo cancellare una spesa dalla lista;
- la cancellazione richiede conferma browser;
- la spesa viene identificata tramite `id`;
- dopo modifica o cancellazione, lista e riepiloghi si aggiornano;
- se una operazione fallisce, lo stato locale non deve essere alterato e l'utente riceve un errore chiaro.

La feature funziona sia con Google Sheets sia con fallback locale di sviluppo.

## Filtri Storico

Lo storico supporta filtri lato UI sulle spese gia caricate.

Filtri disponibili:

- ricerca testuale su descrizione, input originale e note;
- categoria;
- sorgente input: testo, voce o tutte;
- periodo rapido: tutto, oggi, settimana corrente, mese corrente;
- periodo personalizzato con data da/a.

La lista e i riepiloghi devono usare lo stesso insieme filtrato.
Quando nessuna spesa corrisponde ai filtri, l'app mostra uno stato vuoto specifico.
I filtri restano nella schermata principale, dentro la sezione storico, per evitare una pagina dedicata prematura.

## Revisione Prima del Salvataggio

Quando il parsing e incerto, l'app mostra una preview prima di salvare.

La revisione viene richiesta almeno quando:

- la categoria e `other`;
- la descrizione e troppo generica;
- l'input contiene importi multipli.
- l'importo e elevato;
- la data e futura e lontana;
- l'input contiene piu date.

Durante la revisione l'utente puo correggere:

- importo;
- descrizione;
- categoria;
- data.

L'input originale `rawInput` deve essere sempre conservato.
Se l'utente modifica categoria, descrizione o valori, l'app salva una nota di correzione manuale.
La preview indica se la categoria suggerita arriva da AI o da regole locali.

## Requisiti PWA

- L'app deve avere un manifest valido.
- L'app deve avere icone 192x192 e 512x512.
- L'app deve registrare un service worker in produzione.
- La shell dell'app deve essere disponibile offline almeno in forma base.
- L'app deve essere installabile su smartphone in produzione HTTPS.

## Requisiti Input Vocale

- Il pulsante microfono deve essere accessibile da smartphone senza affollare la schermata.
- La dettatura deve usare Web Speech API quando `SpeechRecognition` o `webkitSpeechRecognition` sono disponibili.
- La lingua di riconoscimento deve essere `it-IT`.
- La trascrizione deve compilare il campo testuale mentre il browser sta riconoscendo la voce.
- Quando arriva una trascrizione finale dal browser, l'app deve salvare automaticamente la spesa.
- Una spesa salvata automaticamente da trascrizione vocale deve usare `source: "voice"`.
- Se l'utente modifica manualmente il testo trascritto, il submit torna a `source: "text"`.
- Devono essere mostrati stati chiari per ascolto, trascrizione, salvataggio automatico, errore e browser non supportato.
- Il fallback testuale deve restare sempre disponibile.

## Criteri di Accettazione MVP

- L'app si apre correttamente da browser mobile e desktop.
- L'utente puo inserire `12,50 pranzo al bar`.
- La spesa viene categorizzata come `food`.
- La spesa appare nella lista subito dopo il salvataggio.
- Il totale giornaliero e mensile si aggiornano.
- Il totale annuale e la media giornaliera del mese si aggiornano.
- Se Google Sheets e configurato, viene aggiunta una riga al foglio.
- Se la data appartiene a un anno passato, la spesa viene salvata in `Archive_Detail_YYYY`.
- Se una spesa viene modificata cambiando anno, viene spostata nel foglio corretto.
- Se una spesa viene cancellata, viene rimossa dallo storage configurato.
- Se sono applicati filtri, lista e riepiloghi riflettono solo le spese filtrate.
- Se il parsing e incerto, la spesa viene salvata solo dopo conferma della preview.
- Se Google Sheets non e configurato, lo storage locale di sviluppo continua a funzionare.
- Se Google Sheets e configurato ma la tab richiesta manca, l'app la crea e prepara le intestazioni.
- Se Google Sheets e configurato ma lo spreadsheet id manca o non esiste, l'app puo creare un nuovo file e deve indicare nei log il nuovo `spreadsheetId` da rendere persistente in configurazione.
- L'utente puo esportare il CSV corrente e il backup completo dal tab impostazioni.
- L'utente puo ricostruire il foglio `Generale` dal tab impostazioni.
- L'utente puo bloccare manualmente l'app dal tab impostazioni.
- Se la classificazione AI non e attiva o fallisce, la categoria viene scelta con regole locali.
- Se `AI_CLASSIFICATION_COMPARE=true`, il confronto locale/AI deve restare solo nei log server e non cambiare il modello dati.
- Non ci sono segreti hardcoded nel codice.

## Roadmap

### Release 1.0 corrente

- PWA mobile-first con PIN personale.
- Input testuale e vocale.
- Parser italiano avanzato per date e importi.
- Categorizzazione locale con Gemini opzionale.
- Storico con filtri, refresh, modifica e cancellazione.
- Google Sheets con archiviazione annuale automatica.
- Foglio `Generale` ricostruibile.
- Export CSV corrente e backup completo.
- Test automatici su parser, storage, API, filtri, autenticazione e archiviazione.

### Evoluzioni future

- Riconoscimento spese ricorrenti.
- Notifiche reminder.
- Autenticazione.
- Multi-device.
- Grafici e budget.
- Possibile migrazione da Google Sheets a database.

## Regole per Nuove Istruzioni

Quando viene richiesta una nuova feature:

1. aggiornare questo file se cambia il comportamento atteso;
2. aggiornare `architecture.md` se cambia la struttura tecnica;
3. mantenere l'MVP semplice e mobile-first;
4. preferire funzioni pure per parsing, date e categorizzazione;
5. evitare nuove dipendenze se non sono realmente necessarie;
6. preservare il fallback locale di sviluppo, salvo decisione esplicita contraria.
