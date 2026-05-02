# Spendino - Backlog Task

Questo file raccoglie i prossimi task da elaborare per far evolvere Spendino oltre l'MVP corrente.
I task sono divisi per feature e pensati per essere lavorati in modo incrementale.

## Stato Legenda

- `[ ]` Da fare
- `[~]` Da discutere o chiarire
- `[x]` Fatto

## Analisi UI Attuale

- [x] L'app ha gia le funzioni principali: input testuale, input vocale, preview/revisione, AI opzionale, cancellazione, filtri e lista spese.
- [x] La schermata principale e molto completa, ma su cellulare rischia di concentrare troppe azioni nello stesso flusso.
- [x] I filtri sono gia presenti, ma oggi vivono insieme alla lista sotto l'input; per un uso mobile piu naturale conviene separarli in una sezione o tab dedicato.
- [x] La grafica e gia pulita, ma puo diventare piu memorabile e accattivante con una direzione visuale piu coerente, micro-interazioni e componenti piu rifiniti.

## Feature Prioritaria: UX Mobile a Tab

- [x] Introdurre una navigazione mobile a tab, semplice e sempre raggiungibile.
- [x] Creare un tab principale `Aggiungi` dedicato solo all'inserimento rapido della spesa.
- [x] Creare un tab `Storico` dedicato a spese salvate, filtri, ricerca e cancellazione.
- [~] Valutare un terzo tab leggero `Riepilogo` per totali, andamento e insight futuri, senza appesantire l'MVP. Decisione corrente: non aggiungerlo ancora.
- [x] Spostare filtri e lista completa fuori dal flusso principale di inserimento.
- [x] Nel tab `Aggiungi`, mostrare solo input, voce, feedback, revisione eventuale e riepilogo essenziale.
- [x] Nel tab `Storico`, mostrare lista spese, filtri per categoria e periodo, totale filtrato e stato vuoto.
- [x] Mantenere la navigazione usabile con una mano, con target touch grandi e distanza ridotta dalle dita.
- [~] Persistire il tab attivo durante la sessione, se utile, senza complicare lo stato globale. Decisione corrente: stato in memoria, reset su reload.
- [x] Verificare che la PWA installata sembri una app mobile vera, non una pagina web scrollabile generica.

## Feature Prioritaria: Storico Spese Dedicato

- [x] Creare una vista storico pensata per consultare spese vecchie salvate.
- [x] Separare `Ultime spese` da `Tutte le spese`, mostrando nella home solo un estratto recente.
- [x] Raggruppare le spese nello storico per giorno o per mese, per migliorare la scansione su cellulare.
- [x] Mostrare in alto nel tab storico il totale relativo ai filtri attivi.
- [x] Rendere i filtri comprimibili o apribili da un pulsante, per non occupare troppo spazio su schermi piccoli.
- [x] Aggiungere filtri rapidi visivi per `Oggi`, `Settimana`, `Mese`, `Tutto`.
- [x] Mantenere il filtro categoria facile da usare con chip o selettore mobile-friendly.
- [x] Valutare una ricerca testuale per descrizione come task successivo allo storico.
- [x] Aggiungere ricerca testuale nello storico su descrizione, input originale e note.
- [x] Rendere la cancellazione accessibile nello storico senza renderla troppo facile da premere per errore.

## Feature Prioritaria: Restyling Visuale Premium

- [x] Fare una seconda passata grafica per rendere l'app piu bella, accattivante e futuristica.
- [x] Definire un mini design system: colori, superfici, bordi, ombre, stati e spaziature.
- [~] Sostituire marker testuali delle categorie con icone o simboli piu riconoscibili. La UI e piu rifinita; resta possibile passare a icone vere in futuro.
- [x] Migliorare header e identita visiva di Spendino, mantenendo il focus sull'azione di aggiunta spesa.
- [x] Rendere input e pulsanti principali piu distintivi, con chiara gerarchia tra testo, voce e conferma.
- [x] Aggiungere micro-interazioni leggere per salvataggio, ascolto vocale, successo, errore e cancellazione.
- [x] Curare empty state e stati di caricamento con messaggi brevi e visuali coerenti.
- [x] Migliorare la leggibilita delle card spesa: importo, categoria, data e sorgente devono essere leggibili in un colpo d'occhio.
- [x] Evitare look troppo dashboard o troppo enterprise: l'app deve restare personale, veloce e piacevole.
- [~] Verificare la resa su viewport stretti, telefono grande e desktop prima di segnare la feature come completata. Verificato HTTP 200; resta controllo visuale manuale su dispositivo reale.

## Feature Prioritaria: Restyling Frontend

- [x] Ridisegnare il frontend con una grafica pulita, accattivante e futuristica.
- [x] Mantenere l'esperienza mobile-first, comoda da usare con una mano e leggibile in movimento.
- [x] Definire una direzione visiva coerente: superfici leggere, contrasto chiaro, dettagli luminosi misurati e palette moderna non monotona.
- [x] Migliorare la gerarchia visiva di input, riepiloghi e lista spese, dando priorita all'inserimento rapido.
- [x] Rendere piu curati stati di caricamento, salvataggio, errore e successo.
- [x] Preparare la UI per il futuro pulsante microfono senza affollare la schermata.
- [x] Aggiungere icone dove utili per categorie, azioni principali e sorgente input.
- [x] Verificare che testi, pulsanti e card non si sovrappongano su viewport mobile e desktop.
- [x] Mantenere la grafica semplice: niente layout complessi, niente sezioni decorative che rallentano l'inserimento della spesa.
- [~] Validare il restyling in browser prima di considerarlo completato. Server locale verificato con HTTP 200; resta da fare controllo visivo manuale su mobile/desktop.

## Feature: Input Testuale

- [x] Migliorare il parser per gestire frasi piu naturali, ad esempio `ho pagato 18 euro per una pizza ieri sera`.
- [x] Ampliare il riconoscimento delle date naturali con espressioni come `lunedi scorso`, `la settimana scorsa`, `a fine mese`.
- [x] Gestire meglio descrizioni con importi multipli, scegliendo l'importo principale e conservando il testo originale.
- [x] Aggiungere messaggi di errore piu utili quando manca l'importo o la frase e ambigua.
- [x] Aggiungere test automatici per gli esempi principali di parsing in italiano.

## Feature: Input Vocale

- [x] Aggiungere un pulsante microfono nella UI mobile-first.
- [x] Implementare registrazione o dettatura vocale tramite Web Speech API quando disponibile nel browser.
- [x] Convertire la trascrizione vocale in `rawInput` e riusare lo stesso flusso dell'input testuale.
- [x] Impostare `source: "voice"` per tutte le spese create da input vocale.
- [x] Salvare automaticamente la spesa quando termina la trascrizione vocale finale.
- [x] Mostrare uno stato chiaro durante ascolto, trascrizione, salvataggio ed errore.
- [x] Gestire browser senza supporto alla Web Speech API con fallback testuale.
- [ ] Valutare una soluzione alternativa di trascrizione audio lato server se la Web Speech API non risulta affidabile su smartphone.

## Feature: Categorizzazione AI

- [x] Decidere insieme quale AI usare per classificare le spese: Gemini 2.5 Flash-Lite.
- [x] Definire un'interfaccia interna `ExpenseClassifier` sostituibile, con implementazioni rule-based e AI.
- [x] Mantenere la categorizzazione rule-based come fallback obbligatorio quando l'AI non e configurata o fallisce.
- [x] Preparare un prompt/schema di classificazione che restituisca solo categorie valide:
  - `food`
  - `groceries`
  - `transport`
  - `home`
  - `health`
  - `entertainment`
  - `shopping`
  - `subscriptions`
  - `travel`
  - `other`
- [x] Fare in modo che l'AI riceva solo i dati necessari: descrizione, raw input, importo e data, evitando informazioni sensibili non indispensabili.
- [x] Salvare eventuale confidenza della classificazione solo se utile e dopo aver aggiornato il modello dati. Decisione corrente: non salvarla nel modello dati.
- [x] Aggiungere una modalita di confronto tra categoria rule-based e categoria AI durante lo sviluppo.
- [x] Aggiungere test con frasi realistiche e casi ambigui, ad esempio `12 euro apple`, `30 farmacia`, `45 amazon`, `8 treno`, `20 aperitivo`. Aggiunti test classifier con Gemini mockata e fallback.

## Feature: Scelta Provider AI

- [x] Valutare provider gratuiti o quasi gratuiti per classificazione testuale breve.
- [x] Scegliere provider iniziale: Google Gemini API con modello `gemini-2.5-flash-lite`.
- [x] Confrontare le opzioni rispetto a costo, privacy, accuratezza in italiano, facilita di integrazione e limiti di utilizzo.
- [x] Documentare la decisione scelta in `architecture.md`.
- [x] Aggiungere variabili ambiente dedicate al provider selezionato, senza salvare segreti nel repository:
  - `GEMINI_API_KEY`
  - `AI_PROVIDER=gemini`
  - `AI_MODEL=gemini-2.5-flash-lite`
  - `AI_CLASSIFICATION_ENABLED=true`
  - `AI_CLASSIFICATION_COMPARE=false`
- [x] Prevedere un flag per abilitare o disabilitare la classificazione AI.
- [x] Aggiornare `.env.local.example` con le variabili AI quando si implementa l'integrazione.
- [x] Chiarire nella documentazione di setup che l'account Google usato sul cellulare non deve coincidere con l'account che genera la API key.

## Feature: Revisione Spesa Prima del Salvataggio

- [x] Mostrare una preview della spesa interpretata prima del salvataggio quando il parsing e incerto.
- [x] Permettere all'utente di correggere categoria, descrizione, importo e data prima di confermare.
- [x] Salvare sempre `rawInput` originale anche dopo correzioni manuali.
- [x] Evidenziare quando la categoria e stata scelta dall'AI, dalle regole locali o modificata manualmente.

## Feature: Gestione Categorie

- [x] Centralizzare metadati delle categorie: label italiana, colore, icona e descrizione.
- [x] Uniformare la visualizzazione delle categorie in lista, riepilogo e futuri grafici. La lista e i controlli usano `categoryMeta.ts`; futuri grafici potranno riusarlo.
- [ ] Valutare categorie personalizzabili dopo aver stabilizzato la categorizzazione AI.
- [x] Aggiungere una categoria fallback `other` sempre disponibile.

## Feature: Storico e Correzioni

- [x] Aggiungere cancellazione di una spesa gia salvata.
- [x] Mostrare una conferma prima di cancellare una spesa.
- [x] Aggiungere un'azione elimina nella lista spese, chiara ma non invadente.
- [x] Implementare endpoint o azione server per cancellare una spesa tramite `id`.
- [x] Aggiornare storage Google Sheets e fallback locale per supportare la cancellazione.
- [x] Aggiornare lista, totale giornaliero e totale mensile subito dopo la cancellazione.
- [x] Gestire errore di cancellazione con messaggio chiaro e senza rimuovere la spesa dalla UI se l'operazione fallisce.
- [x] Mostrare se una spesa arriva da testo o voce.
- [x] Preparare lo storage per cancellazioni, non solo append.

## Feature: Protezione App Personale

- [x] Aggiungere una schermata di sblocco con PIN prima di mostrare l'app.
- [x] Supportare un PIN statico configurato tramite `APP_PIN`, con default locale `1234`, sufficiente per uso personale iniziale.
- [x] Dopo lo sblocco corretto, ricordare il dispositivo con cookie httpOnly persistente e marker locale PWA, cosi sul cellulare personale il PIN non viene richiesto a ogni accesso.
- [x] Permettere il reset manuale dello sblocco locale cancellando i dati dell'app o chiamando `POST /api/auth/lock`; resta possibile aggiungere un pulsante UI dedicato in futuro.
- [x] Proteggere la UI client e le API spese tramite middleware con cookie firmato.
- [x] Mostrare messaggi semplici per PIN errato senza esporre dettagli tecnici.

## Feature: Setup Automatico Google Sheets

- [x] Quando le variabili Google Sheets sono configurate, verificare alla prima richiesta che il foglio sia raggiungibile.
- [x] Se la tab configurata manca, creare automaticamente la struttura richiesta con intestazioni `id | date | amount | currency | category | description | rawInput | source | createdAt | notes`.
- [x] Se manca `GOOGLE_SHEETS_SPREADSHEET_ID` o lo spreadsheet configurato non esiste, creare automaticamente un nuovo file Google Sheet tramite API e loggare il nuovo `spreadsheetId`.
- [x] Supportare condivisione opzionale del nuovo file con `GOOGLE_SHEETS_SHARE_WITH_EMAIL` quando Google Drive API e abilitata.
- [x] Se viene creato un nuovo file o una nuova tab, restituire/loggare un messaggio chiaro con nome foglio e id, senza esporre credenziali.
- [x] Mantenere il fallback locale di sviluppo quando le credenziali Google non sono configurate.
- [ ] Aggiungere test o verifiche manuali con credenziali reali per: foglio esistente, tab mancante, foglio non trovato e credenziali assenti.

## Feature: Impostazioni e Diagnostica

- [x] Aggiungere un tab `Impost.` mobile-first.
- [x] Mostrare stato storage locale o Google Sheets senza chiamate distruttive.
- [x] Aggiungere diagnostica manuale Google Sheets dal tab impostazioni.
- [x] Aggiungere pulsante `Blocca app` per cancellare lo sblocco sul dispositivo.
- [x] Aggiungere export CSV delle spese dallo storage configurato.
- [x] Proteggere diagnostica ed export con cookie PIN.

## Feature: Hardening API

- [x] Proteggere `/api/expenses` con cookie PIN firmato.
- [x] Proteggere `/api/storage/diagnostics` con cookie PIN firmato.
- [x] Proteggere export CSV con cookie PIN firmato.
- [x] Controllare l'origine delle richieste mutating verso API auth e spese.
- [x] Aggiungere `APP_ALLOWED_ORIGIN` per esplicitare l'origine HTTPS ammessa in produzione.

## Feature: Qualita e Test

- [~] Aggiungere test unitari per parser, date e categorizzazione. Aggiunto `pnpm test:parser` per parser, date naturali e categorizzazione indiretta.
- [x] Aggiungere test per il fallback locale su `data/expenses.json`.
- [ ] Aggiungere test per API `GET /api/expenses` e `POST /api/expenses`.
- [x] Aggiungere casi di test specifici per input vocali trascritti male o con punteggiatura assente.
- [x] Aggiungere test per la logica di revisione spesa incerta.
- [x] Aggiungere test per completezza metadati categorie.
- [x] Aggiungere test per validazione PIN e token di sblocco.
- [ ] Aggiungere test API per export CSV e diagnostica storage.
- [ ] Verificare manualmente il flusso su browser mobile.
- [x] Verificare che la PWA resti installabile dopo le modifiche UI. Manifest rafforzato per mobile, icone verificate 192/512, service worker aggiornato per shell offline e asset statici.

## Feature: Privacy e Sicurezza

- [x] Documentare quali dati vengono inviati all'eventuale provider AI.
- [x] Evitare l'invio di storico completo spese all'AI per la sola classificazione di una nuova spesa.
- [x] Tenere tutte le API key in `.env.local`.
- [x] Gestire errori del provider AI senza mostrare dettagli tecnici all'utente.
- [x] Prevedere una modalita completamente locale: parser e categorizzazione rule-based senza AI.
- [x] Documentare che il PIN statico e una protezione leggera per uso personale, non una vera autenticazione multiutente.

## Prossima Decisione Consigliata

La prossima decisione non e piu il provider AI, che e stato scelto: Gemini 2.5 Flash-Lite.
Prima di implementare, decidere solo se attivarlo subito in sviluppo o lasciarlo dietro flag disabilitato di default.

La scelta fatta privilegia:

1. buona comprensione dell'italiano;
2. costo nullo o molto basso;
3. integrazione semplice in Next.js;
4. fallback locale sempre disponibile;
5. trattamento prudente dei dati personali.

Quando si passa all'implementazione, aggiornare:

- `src/lib/categorizeExpense.ts` o un nuovo modulo classifier;
- `app/api/expenses/route.ts`, se la classificazione diventa asincrona;
- `.env.local.example`, se servono nuove variabili ambiente.

## Feature Non Prioritaria: Filtri Spese Salvate

- [x] Permettere di filtrare le spese salvate per categoria.
- [x] Permettere di filtrare le spese salvate per periodo temporale.
- [x] Permettere di cercare le spese salvate per testo.
- [x] Supportare filtri rapidi come oggi, settimana corrente, mese corrente e periodo personalizzato.
- [x] Valutare se i filtri devono stare nella schermata principale o in una pagina dedicata dello storico. Decisione: schermata principale, dentro la sezione storico.
- [x] Mostrare totale e lista coerenti con i filtri applicati.
- [x] Prevedere uno stato vuoto chiaro quando nessuna spesa corrisponde ai filtri.
- [x] Mantenere i filtri semplici e comodi da usare su smartphone.
