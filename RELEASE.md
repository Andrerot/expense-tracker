# Spendino Release 1.0.0

Data: 2026-05-17

## Stato

Release candidata pronta per uso personale stabile.

## Contenuto Release

- PWA mobile-first installabile.
- Protezione personale con PIN, cookie httpOnly firmato, rate limit e controllo origine per richieste mutating.
- Inserimento spese tramite testo naturale o voce.
- Parser italiano avanzato:
  - importi con virgola, punto, simbolo euro e parole;
  - importi vocali come `dodici euro e cinquanta`;
  - date naturali ed esplicite;
  - revisione per importi elevati, date multiple e date future lontane.
- Categorizzazione rule-based con Gemini opzionale.
- Revisione prima del salvataggio per spese incerte.
- Storico con filtri, ricerca, refresh, modifica e cancellazione.
- Google Sheets come storage principale.
- Archiviazione automatica:
  - `Expenses` per anno corrente e futuro;
  - `Archive_Detail_YYYY` per anni passati;
  - `Generale` per riepilogo anno/mese.
- Export CSV corrente e backup CSV completo.
- Fallback locale di sviluppo in `data/expenses.json`.

## Verifiche Automatiche

Da eseguire prima del deploy:

```bash
pnpm typecheck
pnpm test
pnpm build
```

In questo ambiente sono stati verificati con successo anche i comandi equivalenti via `node` e `next.cmd`.

## Verifiche Manuali Pre-Deploy

Con Google Sheets reale configurato:

1. Sbloccare l'app con PIN.
2. Aggiungere una spesa dell'anno corrente.
3. Aggiungere una spesa di un anno passato e verificare `Archive_Detail_YYYY`.
4. Modificare una spesa cambiando anno e verificare lo spostamento tra fogli.
5. Cancellare una spesa da storico.
6. Usare `Aggiorna` nello storico.
7. Usare `Verifica storage`.
8. Usare `Ricostruisci Generale`.
9. Scaricare `Esporta CSV corrente`.
10. Scaricare `Backup CSV completo`.
11. Installare come PWA su smartphone e provare input vocale.

## Note Di Configurazione

Variabili minime consigliate in produzione:

```env
APP_PIN=
APP_AUTH_SECRET=
APP_ALLOWED_ORIGIN=
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_SHEET_NAME=Expenses
```

Gemini resta opzionale:

```env
GEMINI_API_KEY=
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
AI_CLASSIFICATION_ENABLED=false
AI_CLASSIFICATION_COMPARE=false
```

## Rischi Residui

- Le operazioni Google Sheets avanzate sono implementate ma vanno validate con credenziali reali e file reale.
- La Web Speech API dipende dal browser mobile.
- Il PIN e una protezione personale leggera, non autenticazione multiutente.
