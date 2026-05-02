import type { ExpenseCategory } from "@/types/expense";

type CategoryMeta = {
  description: string;
  label: string;
  tone: string;
  marker: string;
};

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  food: {
    description: "Bar, ristoranti, pranzi, cene e consumazioni fuori casa.",
    label: "Cibo",
    tone: "bg-rose-100 text-rose-900 ring-rose-200",
    marker: "CB",
  },
  groceries: {
    description: "Spesa alimentare e acquisti da supermercato.",
    label: "Spesa",
    tone: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    marker: "SP",
  },
  transport: {
    description: "Mezzi, carburante, parcheggi, treni, taxi e spostamenti.",
    label: "Trasporti",
    tone: "bg-sky-100 text-sky-900 ring-sky-200",
    marker: "TR",
  },
  home: {
    description: "Casa, bollette, affitto, connessioni e spese domestiche.",
    label: "Casa",
    tone: "bg-stone-100 text-stone-900 ring-stone-200",
    marker: "CA",
  },
  health: {
    description: "Farmacia, visite, medici, analisi e salute personale.",
    label: "Salute",
    tone: "bg-teal-100 text-teal-900 ring-teal-200",
    marker: "SA",
  },
  entertainment: {
    description: "Cinema, eventi, libri, giochi e tempo libero.",
    label: "Svago",
    tone: "bg-violet-100 text-violet-900 ring-violet-200",
    marker: "SV",
  },
  shopping: {
    description: "Abbigliamento, elettronica, negozi online e acquisti vari.",
    label: "Shopping",
    tone: "bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-200",
    marker: "SH",
  },
  subscriptions: {
    description: "Servizi ricorrenti, streaming, software e abbonamenti.",
    label: "Abbonamenti",
    tone: "bg-indigo-100 text-indigo-900 ring-indigo-200",
    marker: "AB",
  },
  travel: {
    description: "Hotel, voli, vacanze, prenotazioni e viaggi.",
    label: "Viaggi",
    tone: "bg-amber-100 text-amber-950 ring-amber-200",
    marker: "VI",
  },
  other: {
    description: "Fallback per spese non riconosciute o non classificabili.",
    label: "Altro",
    tone: "bg-zinc-100 text-zinc-900 ring-zinc-200",
    marker: "AL",
  },
};
