const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

/** "Sat 14 Nov" */
export const formatWeekdayDate = (iso: string): string => {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "Sat 14 Nov 2026" */
export const formatFullDate = (iso: string): string =>
  `${formatWeekdayDate(iso)} ${parseISODate(iso).getFullYear()}`;
