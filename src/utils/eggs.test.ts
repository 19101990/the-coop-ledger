import { describe, expect, it } from 'vitest';
import type { DBLogEntry } from '../types/types';
import { countsFromLog, countsTotal, EGG_VARIETIES, emptyEggCounts, logTotal } from './eggs';

describe('egg counts', () => {
  it('emptyEggCounts has every variety at zero', () => {
    const counts = emptyEggCounts();
    expect(Object.keys(counts)).toEqual(EGG_VARIETIES);
    expect(countsTotal(counts)).toBe(0);
  });

  it('countsTotal adds all varieties', () => {
    expect(countsTotal({ ...emptyEggCounts(), brown: 4, blue: 2, perlhuhn: 1 })).toBe(7);
  });

  it('logTotal adds the egg columns and treats missing/null/string values safely', () => {
    expect(logTotal({ eggs_brown: 3, eggs_white: 2 })).toBe(5);
    // Supabase can return numeric columns as strings or null.
    expect(logTotal({ eggs_brown: '3', eggs_white: null } as never)).toBe(3);
    expect(logTotal({})).toBe(0);
  });

  it('countsFromLog turns a log row into form counts', () => {
    const log = { eggs_chocolate: 1, eggs_olive: 5, eggs_white: null } as unknown as DBLogEntry;
    const counts = countsFromLog(log);
    expect(counts.chocolate).toBe(1);
    expect(counts.olive).toBe(5);
    expect(counts.white).toBe(0);
    expect(countsTotal(counts)).toBe(6);
  });
});
