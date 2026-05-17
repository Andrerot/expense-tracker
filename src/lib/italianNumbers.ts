const SIMPLE_NUMBERS = new Map([
  ["zero", 0],
  ["un", 1],
  ["uno", 1],
  ["una", 1],
  ["due", 2],
  ["tre", 3],
  ["quattro", 4],
  ["cinque", 5],
  ["sei", 6],
  ["sette", 7],
  ["otto", 8],
  ["nove", 9],
  ["dieci", 10],
  ["undici", 11],
  ["dodici", 12],
  ["tredici", 13],
  ["quattordici", 14],
  ["quindici", 15],
  ["sedici", 16],
  ["diciassette", 17],
  ["diciotto", 18],
  ["diciannove", 19],
  ["venti", 20],
  ["trenta", 30],
  ["quaranta", 40],
  ["cinquanta", 50],
  ["sessanta", 60],
  ["settanta", 70],
  ["ottanta", 80],
  ["novanta", 90],
]);

const TENS = [
  ["vent", 20],
  ["trent", 30],
  ["quarant", 40],
  ["cinquant", 50],
  ["sessant", 60],
  ["settant", 70],
  ["ottant", 80],
  ["novant", 90],
] as const;

const UNITS = new Map([
  ["uno", 1],
  ["due", 2],
  ["tre", 3],
  ["quattro", 4],
  ["cinque", 5],
  ["sei", 6],
  ["sette", 7],
  ["otto", 8],
  ["nove", 9],
]);

export const ITALIAN_NUMBER_WORD_PATTERN =
  "(?:un|uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|tredici|quattordici|quindici|sedici|diciassette|diciotto|diciannove|venti|ventuno|ventidue|ventitre|ventiquattro|venticinque|ventisei|ventisette|ventotto|ventinove|trenta|trentuno|trentadue|trentatre|trentaquattro|trentacinque|trentasei|trentasette|trentotto|trentanove|quaranta|quarantuno|quarantadue|quarantatre|quarantaquattro|quarantacinque|quarantasei|quarantasette|quarantotto|quarantanove|cinquanta|cinquantuno|cinquantadue|cinquantatre|cinquantaquattro|cinquantacinque|cinquantasei|cinquantasette|cinquantotto|cinquantanove|sessanta|sessantuno|sessantadue|sessantatre|sessantaquattro|sessantacinque|sessantasei|sessantasette|sessantotto|sessantanove|settanta|settantuno|settantadue|settantatre|settantaquattro|settantacinque|settantasei|settantasette|settantotto|settantanove|ottanta|ottantuno|ottantadue|ottantatre|ottantaquattro|ottantacinque|ottantasei|ottantasette|ottantotto|ottantanove|novanta|novantuno|novantadue|novantatre|novantaquattro|novantacinque|novantasei|novantasette|novantotto|novantanove)";

export function parseItalianInteger(value: string): number | null {
  const normalized = value.toLocaleLowerCase("it-IT").replace(/[\s'-]/g, "");
  const simpleValue = SIMPLE_NUMBERS.get(normalized);

  if (simpleValue !== undefined) {
    return simpleValue;
  }

  for (const [prefix, tenValue] of TENS) {
    if (!normalized.startsWith(prefix)) {
      continue;
    }

    const unit = normalized.slice(prefix.length);
    const unitValue = UNITS.get(unit);

    if (unitValue !== undefined) {
      return tenValue + unitValue;
    }
  }

  return null;
}
