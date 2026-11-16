const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A calendar month; `month` is 0-based like Date#getMonth. */
export interface YearMonth {
  year: number;
  month: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export const currentYearMonth = (): YearMonth => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
};

export const shiftMonth = ({ year, month }: YearMonth, delta: number): YearMonth => {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export const isSameMonth = (a: YearMonth, b: YearMonth) => a.year === b.year && a.month === b.month;

/** Date range for queries: from <= date < to, as YYYY-MM-DD. */
export const monthRange = (ym: YearMonth): { from: string; to: string } => {
  const next = shiftMonth(ym, 1);
  return { from: `${ym.year}-${pad2(ym.month + 1)}-01`, to: `${next.year}-${pad2(next.month + 1)}-01` };
};

/** "Nov 2026" */
export const formatMonthShort = ({ year, month }: YearMonth) => `${MONTHS[month]} ${year}`;

/** "November" */
export const formatMonthLong = ({ month }: YearMonth) => MONTHS_LONG[month];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Two-letter tile code for a category: "Egg Sales" → "EG", "Food" → "FO". */
export const categoryCode = (name: string): string =>
  name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '··';

/** "€ 6,00" */
export const formatEUR = (n: number): string => eur.format(n);

/** "+€ 6,00" / "−€ 6,00" (true minus sign) / "€ 0,00" */
export const formatSignedEUR = (n: number): string =>
  (n > 0 ? '+' : n < 0 ? '−' : '') + eur.format(Math.abs(n));

// Parse YYYY-MM-DD as a local date (midday avoids DST/timezone edge cases).
const parseISODate = (iso: string): Date => new Date(`${iso.slice(0, 10)}T12:00:00`);

/** "14 Nov" */
export const formatDayMonth = (iso: string): string => {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "14 Nov" this year, "14 Nov 2025" otherwise. */
export const formatDayMonthMaybeYear = (iso: string): string => {
  const year = parseISODate(iso).getFullYear();
  return year === new Date().getFullYear() ? formatDayMonth(iso) : `${formatDayMonth(iso)} ${year}`;
};

/** "Sat 14 Nov" */
export const formatWeekdayDate = (iso: string): string => {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "Sat 14 Nov 2026" */
export const formatFullDate = (iso: string): string =>
  `${formatWeekdayDate(iso)} ${parseISODate(iso).getFullYear()}`;
