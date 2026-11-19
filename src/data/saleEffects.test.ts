import { describe, expect, it, vi } from 'vitest';

// The real client needs Supabase env vars; these tests only cover the pure helpers.
vi.mock('../supabaseClient', () => ({ supabase: {} }));

const { hasIncome, returnToPantry, saleIncomeDescription, takeFromPantry } = await import('./saleEffects');

const stock = (boxes_for_sale: number, loose_eggs: number) => ({ boxes_for_sale, loose_eggs });
const eggsIn = ({ newSaleBoxes, newLoose }: { newSaleBoxes: number; newLoose: number }) => newSaleBoxes * 10 + newLoose;

describe('takeFromPantry', () => {
  it('takes whole boxes and loose eggs', () => {
    expect(takeFromPantry(stock(5, 4), 23)).toEqual({ newSaleBoxes: 3, newLoose: 1 });
  });

  it('breaks a box when there are not enough loose eggs', () => {
    expect(takeFromPantry(stock(2, 3), 5)).toEqual({ newSaleBoxes: 1, newLoose: 8 });
  });

  it('removes exactly the eggs sold when there is enough stock', () => {
    for (const [boxes, loose, sold] of [
      [3, 0, 10],
      [3, 9, 9],
      [1, 0, 1],
      [4, 7, 47],
    ]) {
      expect(eggsIn(takeFromPantry(stock(boxes, loose), sold))).toBe(boxes * 10 + loose - sold);
    }
  });

  it('takes from loose eggs when there are not enough boxes', () => {
    expect(takeFromPantry(stock(0, 25), 12)).toEqual({ newSaleBoxes: 0, newLoose: 13 });
    expect(takeFromPantry(stock(1, 15), 23)).toEqual({ newSaleBoxes: 0, newLoose: 2 });
  });

  it('empties the pantry when selling more than is in stock, never adds eggs', () => {
    expect(takeFromPantry(stock(0, 3), 5)).toEqual({ newSaleBoxes: 0, newLoose: 0 });
    expect(takeFromPantry(stock(1, 0), 30)).toEqual({ newSaleBoxes: 0, newLoose: 0 });
    expect(takeFromPantry(stock(0, 0), 1)).toEqual({ newSaleBoxes: 0, newLoose: 0 });
  });
});

describe('returnToPantry', () => {
  it('puts whole tens back as boxes and the rest as loose eggs', () => {
    expect(returnToPantry(stock(1, 2), 23)).toEqual({ newSaleBoxes: 3, newLoose: 5 });
  });

  it('undoes takeFromPantry in egg terms', () => {
    const before = stock(4, 6);
    const after = takeFromPantry(before, 17);
    const back = returnToPantry({ boxes_for_sale: after.newSaleBoxes, loose_eggs: after.newLoose }, 17);
    expect(eggsIn(back)).toBe(46);
  });
});

describe('sale ledger helpers', () => {
  it('only paid sales with a price create income', () => {
    expect(hasIncome('Paid', 5)).toBe(true);
    expect(hasIncome('Paid', 0)).toBe(false);
    expect(hasIncome('Gift', 5)).toBe(false);
  });

  it('describes the income entry consistently (used to find it again)', () => {
    expect(saleIncomeDescription(12, 'Anna')).toBe('Sold 12 eggs to Anna');
  });
});
