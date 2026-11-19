import { describe, expect, it } from 'vitest';
import { compareNewestFirst, signedAmount } from './transactions';

describe('signedAmount', () => {
  it('keeps income positive and makes expenses negative', () => {
    expect(signedAmount({ type: 'income', amount: 12.5 })).toBe(12.5);
    expect(signedAmount({ type: 'expense', amount: 12.5 })).toBe(-12.5);
  });
});

describe('compareNewestFirst', () => {
  it('sorts by date, newest first, then by id (later entries first)', () => {
    const rows = [
      { id: 1, date: '2026-11-01' },
      { id: 3, date: '2026-11-19' },
      { id: 2, date: '2026-11-19' },
      { id: 4, date: '2026-10-31' },
    ];
    expect([...rows].sort(compareNewestFirst).map((r) => r.id)).toEqual([3, 2, 1, 4]);
  });
});
