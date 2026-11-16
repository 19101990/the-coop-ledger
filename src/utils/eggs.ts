import type { DBLogEntry, EggCounts, EggVariety } from '../types/types';

/** Varieties in display order (design/README.md). */
export const EGG_VARIETIES: EggVariety[] = ['chocolate', 'brown', 'beige', 'white', 'blue', 'olive', 'nato', 'perlhuhn'];

/** Swatch colour per egg variety. */
export const EGG_SWATCHES: Record<EggVariety, string> = {
  chocolate: '#6b4430',
  brown: '#a8714a',
  beige: '#dcc29c',
  white: '#fbf8f2',
  blue: '#bcd2cf',
  olive: '#9a9a62',
  nato: '#c9a77f',
  perlhuhn: '#e6d3bd',
};

export const eggVarietyLabel = (v: EggVariety): string => v.charAt(0).toUpperCase() + v.slice(1);

export const emptyEggCounts = (): EggCounts =>
  Object.fromEntries(EGG_VARIETIES.map((v) => [v, 0])) as unknown as EggCounts;

/** Total eggs in the form's counter state. */
export const countsTotal = (counts: EggCounts): number =>
  EGG_VARIETIES.reduce((sum, v) => sum + (counts[v] || 0), 0);

/** Total eggs in a daily_log row (only the egg columns are needed). */
export const logTotal = (log: Partial<Pick<DBLogEntry, `eggs_${EggVariety}`>>): number =>
  EGG_VARIETIES.reduce((sum, v) => sum + (Number(log[`eggs_${v}`]) || 0), 0);

/** Form counter state from a daily_log row. */
export const countsFromLog = (log: DBLogEntry): EggCounts =>
  Object.fromEntries(EGG_VARIETIES.map((v) => [v, log[`eggs_${v}`] || 0])) as unknown as EggCounts;

/** Today as YYYY-MM-DD (same convention the app has always used for log/sale dates). */
export const todayISO = (): string => new Date().toISOString().split('T')[0];
