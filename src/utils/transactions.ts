import type { TransactionEntry } from '../types/types';

/** Amount with sign: income positive, expense negative. */
export const signedAmount = (t: Pick<TransactionEntry, 'type' | 'amount'>): number =>
  t.type === 'income' ? t.amount : -t.amount;

/** Newest first: by date, then by id (later entries on the same day first). */
export const compareNewestFirst = (a: Pick<TransactionEntry, 'date' | 'id'>, b: Pick<TransactionEntry, 'date' | 'id'>): number =>
  b.date.localeCompare(a.date) || b.id - a.id;
