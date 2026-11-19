import { describe, expect, it } from 'vitest';
import { buildEggSeries, periodStart, shiftDays } from './eggChart';

// Thursday 19 Nov 2026; its week starts Monday 16 Nov.
const TODAY = '2026-11-19';

describe('shiftDays', () => {
  it('crosses month and year boundaries', () => {
    expect(shiftDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('is not affected by daylight saving changes', () => {
    expect(shiftDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(shiftDays('2026-10-24', 2)).toBe('2026-10-26');
  });
});

describe('periodStart', () => {
  it('daily periods include today', () => {
    expect(periodStart('14d', TODAY)).toBe('2026-11-06');
    expect(periodStart('30d', TODAY)).toBe('2026-10-21');
  });

  it('3m starts on a Monday, 12 weeks before this week', () => {
    expect(periodStart('3m', TODAY)).toBe('2026-08-24');
  });

  it('12m starts on the 1st, 11 months back', () => {
    expect(periodStart('12m', TODAY)).toBe('2025-12-01');
  });
});

describe('buildEggSeries', () => {
  it('14d: one bar per day, unlogged days are null (not zero)', () => {
    const totals = new Map([
      ['2026-11-19', 12],
      ['2026-11-18', 0],
      ['2026-11-01', 99], // before the period
    ]);
    const s = buildEggSeries(totals, '14d', TODAY);

    expect(s.buckets).toHaveLength(14);
    expect(s.buckets[0].key).toBe('2026-11-06');
    expect(s.buckets[13]).toMatchObject({ key: TODAY, value: 12, total: 12, loggedDays: 1 });
    expect(s.buckets[12]).toMatchObject({ value: 0, loggedDays: 1 }); // logged zero stays zero
    expect(s.buckets[11]).toMatchObject({ value: null, loggedDays: 0 });
    expect(s.perDay).toBe(false);
    expect(s.total).toBe(12);
    expect(s.loggedDays).toBe(2);
  });

  it('3m: weekly bars show the average per logged day', () => {
    const totals = new Map([
      ['2026-11-16', 10], // this week (Mon)
      ['2026-11-18', 20], // this week (Wed)
      ['2026-11-20', 50], // after today: ignored
      ['2026-11-15', 7], // last week (Sun)
    ]);
    const s = buildEggSeries(totals, '3m', TODAY);

    expect(s.buckets).toHaveLength(13);
    expect(s.buckets[0].key).toBe('2026-08-24');
    expect(s.buckets[12]).toMatchObject({ key: '2026-11-16', value: 15, total: 30, loggedDays: 2 });
    expect(s.buckets[11]).toMatchObject({ key: '2026-11-09', value: 7, total: 7, loggedDays: 1 });
    expect(s.buckets[10].value).toBeNull();
    expect(s.perDay).toBe(true);
    expect(s.total).toBe(37);
    expect(s.loggedDays).toBe(3);
  });

  it('12m: monthly bars from the same month last year+1 to this month', () => {
    const totals = new Map([
      ['2025-11-30', 100], // before the period
      ['2025-12-01', 4],
      ['2025-12-31', 6],
      ['2026-11-19', 9],
    ]);
    const s = buildEggSeries(totals, '12m', TODAY);

    expect(s.buckets).toHaveLength(12);
    expect(s.buckets[0]).toMatchObject({ key: '2025-12-01', title: 'December 2025', value: 5, total: 10, loggedDays: 2 });
    expect(s.buckets[11]).toMatchObject({ key: '2026-11-01', axisLabel: 'Nov', value: 9 });
    expect(s.total).toBe(19);
    expect(s.loggedDays).toBe(3);
  });
});
