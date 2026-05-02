const DAY_IN_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = new Map([
  ["domenica", 0],
  ["lunedi", 1],
  ["martedi", 2],
  ["mercoledi", 3],
  ["giovedi", 4],
  ["venerdi", 5],
  ["sabato", 6],
]);

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveNaturalDate(input: string, now = new Date()): string {
  const normalized = normalizeItalianText(input);

  if (/\bieri\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() - DAY_IN_MS));
  }

  if (/\bdomani\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() + DAY_IN_MS));
  }

  if (/\b(settimana scorsa|scorsa settimana)\b/.test(normalized)) {
    return toIsoDate(new Date(now.getTime() - 7 * DAY_IN_MS));
  }

  if (/\b(fine mese|a fine mese)\b/.test(normalized)) {
    return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  for (const [weekday, targetDay] of WEEKDAYS.entries()) {
    if (new RegExp(`\\b${weekday}(?:\\s+scorso|\\s+scorsa)?\\b`).test(normalized)) {
      const currentDay = now.getDay();
      const daysBack = (currentDay - targetDay + 7) % 7 || 7;
      return toIsoDate(new Date(now.getTime() - daysBack * DAY_IN_MS));
    }
  }

  return toIsoDate(now);
}

export function isSameMonth(dateIso: string, now = new Date()): boolean {
  return dateIso.slice(0, 7) === toIsoDate(now).slice(0, 7);
}

export function normalizeItalianText(input: string): string {
  return input
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
