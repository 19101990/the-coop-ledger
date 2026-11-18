// Number part only, e.g. "1234,50": comma for decimals, no thousands separator.
// The € sign is added by formatEUR without a gap.
const eurNumber = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A calendar month; `month` is 0-based like Date#getMonth. */
export interface YearMonth {
  year: number;
  month: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * A date as YYYY-MM-DD in the device's local time zone. Don't use `toISOString()` for this: it gives
 * the UTC date, which in the Netherlands is still yesterday between midnight and 1:00 (2:00 in summer).
 */
export const toLocalISODate = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Today's date in local time, as YYYY-MM-DD (the format log, sale and transaction dates use). */
export const todayLocal = (): string => toLocalISODate(new Date());

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

/**
 * Money: "€6,00", "€1234,50"; negatives as "− €6,00" (true minus sign, then a space).
 * No plus sign for positive amounts — an unsigned amount is income/positive.
 */
export const formatEUR = (n: number): string => {
  const amount = `€${eurNumber.format(Math.abs(n))}`;
  // Treat values that round to 0,00 as zero so we never show "− €0,00".
  return Math.round(n * 100) < 0 ? `− ${amount}` : amount;
};

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
