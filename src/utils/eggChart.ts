import { formatDayMonth, formatWeekdayDate } from './format';

export type EggPeriod = '14d' | '30d' | '3m' | '12m';

export interface EggBucket {
  key: string;
  /** Axis label, or '' when this bar's label is skipped to avoid crowding. */
  axisLabel: string;
  /** Long label for the tooltip / table, e.g. "Sat 14 Nov" or "Week of 7 Oct". */
  title: string;
  /** Eggs (daily periods) or average eggs per logged day (weekly/monthly); null = nothing logged. */
  value: number | null;
  /** Total eggs in the bucket (same as value for daily bars). */
  total: number;
  loggedDays: number;
}

export interface EggSeries {
  buckets: EggBucket[];
  /** What a bar measures. */
  perDay: boolean;
  /** Totals over the whole period. */
  total: number;
  loggedDays: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Dates are YYYY-MM-DD strings, the same convention the logs use; do the arithmetic in UTC.
const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const shiftDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
/** Monday of the week containing `iso`. */
const weekStart = (iso: string) => shiftDays(iso, -((toDate(iso).getUTCDay() + 6) % 7));

/** First day included in a period ending today. */
export const periodStart = (period: EggPeriod, today: string): string => {
  if (period === '14d') return shiftDays(today, -13);
  if (period === '30d') return shiftDays(today, -29);
  if (period === '3m') return shiftDays(weekStart(today), -7 * 12);
  const d = toDate(today);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 11, 1, 12)));
};

/** Sum the logged days in [from, to] (inclusive). */
const collect = (totals: Map<string, number>, from: string, to: string) => {
  let total = 0;
  let loggedDays = 0;
  totals.forEach((n, date) => {
    if (date >= from && date <= to) {
      total += n;
      loggedDays += 1;
    }
  });
  return { total, loggedDays };
};

/**
 * Turn daily totals (date → eggs collected) into bars for a period ending today.
 * 14d / 30d: one bar per day. 3m: one bar per week, 12m: one bar per month — both as the
 * average per logged day, so short and long buckets stay comparable. Days without a log
 * are left out rather than counted as zero.
 */
export function buildEggSeries(totals: Map<string, number>, period: EggPeriod, today: string): EggSeries {
  const buckets: EggBucket[] = [];

  if (period === '14d' || period === '30d') {
    const days = period === '14d' ? 14 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const date = shiftDays(today, -i);
      const logged = totals.has(date);
      const n = totals.get(date) ?? 0;
      buckets.push({
        key: date,
        axisLabel: days === 14 || i % 5 === 0 ? String(toDate(date).getUTCDate()) : '',
        title: formatWeekdayDate(date),
        value: logged ? n : null,
        total: n,
        loggedDays: logged ? 1 : 0,
      });
    }
  } else if (period === '3m') {
    const thisWeek = weekStart(today);
    for (let i = 12; i >= 0; i--) {
      const start = shiftDays(thisWeek, -7 * i);
      const end = shiftDays(start, 6);
      const { total, loggedDays } = collect(totals, start, end < today ? end : today);
      buckets.push({
        key: start,
        axisLabel: i % 4 === 0 ? formatDayMonth(start) : '',
        title: `Week of ${formatDayMonth(start)}`,
        value: loggedDays ? total / loggedDays : null,
        total,
        loggedDays,
      });
    }
  } else {
    const t = toDate(today);
    for (let i = 11; i >= 0; i--) {
      const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1, 12));
      const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
      const { total, loggedDays } = collect(totals, toISO(first), toISO(last));
      buckets.push({
        key: toISO(first),
        axisLabel: MONTHS[first.getUTCMonth()],
        title: `${MONTHS_LONG[first.getUTCMonth()]} ${first.getUTCFullYear()}`,
        value: loggedDays ? total / loggedDays : null,
        total,
        loggedDays,
      });
    }
  }

  const overall = collect(totals, periodStart(period, today), today);
  return { buckets, perDay: period === '3m' || period === '12m', ...overall };
}
