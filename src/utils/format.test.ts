import { describe, expect, it } from 'vitest';
import {
  formatDayMonth,
  formatEUR,
  formatFullDate,
  formatMonthLong,
  formatMonthShort,
  isSameMonth,
  monthRange,
  shiftMonth,
  toLocalISODate,
} from './format';

describe('formatEUR', () => {
  it('uses a comma for decimals and always two decimals', () => {
    expect(formatEUR(6)).toBe('€6,00');
    expect(formatEUR(0.5)).toBe('€0,50');
    expect(formatEUR(12.345)).toBe('€12,35');
  });

  it('has no thousands separator', () => {
    expect(formatEUR(1234.5)).toBe('€1234,50');
  });

  it('shows negatives with a true minus sign and a space', () => {
    expect(formatEUR(-6)).toBe('− €6,00');
  });

  it('never shows a negative zero', () => {
    expect(formatEUR(0)).toBe('€0,00');
    expect(formatEUR(-0.004)).toBe('€0,00');
  });

  it('handles floating-point sums', () => {
    expect(formatEUR(0.1 + 0.2)).toBe('€0,30');
  });
});

describe('toLocalISODate', () => {
  it('uses the local date, not UTC', () => {
    // 00:30 local time is still the previous day in UTC for any zone east of Greenwich.
    expect(toLocalISODate(new Date(2026, 10, 19, 0, 30))).toBe('2026-11-19');
    expect(toLocalISODate(new Date(2026, 10, 19, 23, 59))).toBe('2026-11-19');
  });

  it('pads month and day', () => {
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('months', () => {
  it('shiftMonth crosses year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 5 }, -18)).toEqual({ year: 2024, month: 11 });
  });

  it('isSameMonth compares year and month', () => {
    expect(isSameMonth({ year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(true);
    expect(isSameMonth({ year: 2026, month: 10 }, { year: 2025, month: 10 })).toBe(false);
  });

  it('monthRange is from the 1st up to (not including) the next 1st', () => {
    expect(monthRange({ year: 2026, month: 10 })).toEqual({ from: '2026-11-01', to: '2026-12-01' });
    expect(monthRange({ year: 2026, month: 11 })).toEqual({ from: '2026-12-01', to: '2027-01-01' });
  });

  it('formats month names', () => {
    expect(formatMonthShort({ year: 2026, month: 10 })).toBe('Nov 2026');
    expect(formatMonthLong({ year: 2026, month: 0 })).toBe('January');
  });
});

describe('date labels', () => {
  it('formats YYYY-MM-DD strings without shifting the day', () => {
    expect(formatDayMonth('2026-11-14')).toBe('14 Nov');
    expect(formatFullDate('2026-11-14')).toBe('Sat 14 Nov 2026');
  });

  it('ignores a time part', () => {
    expect(formatDayMonth('2026-03-01T23:30:00Z')).toBe('1 Mar');
  });
});
