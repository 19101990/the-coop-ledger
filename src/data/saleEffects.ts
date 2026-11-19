/**
 * Everything a sale touches besides its own row: the pantry stock and the matching
 * "Egg Sales" income entry in the ledger. Used when recording, editing and deleting sales,
 * so all three paths follow the same rules.
 */
import { supabase } from '../supabaseClient';
import { demoStore } from '../demo/demoStore';
import type { SaleEntry } from '../types/types';

export const EGG_SALES_CATEGORY = 'Egg Sales';

/** Ledger description written for a paid sale (also used to find it again). */
export const saleIncomeDescription = (eggs: number, customer: string) => `Sold ${eggs} eggs to ${customer}`;

/** A paid sale with a price gets an income entry; gifts and free sales don't. */
export const hasIncome = (status: SaleEntry['status'], price: number) => status === 'Paid' && price > 0;

// ---------- Pantry ----------

interface SaleStock {
  boxes_for_sale: number;
  loose_eggs: number;
}

/**
 * Take eggs out of stock: full boxes first, then loose eggs (breaking a box if needed).
 * If there aren't enough boxes, the rest comes out of the loose eggs. Selling more than is in
 * stock empties the pantry; it never adds eggs.
 */
export const takeFromPantry = (pantry: SaleStock, eggs: number) => {
  let newLoose = pantry.loose_eggs - (eggs % 10);
  let newSaleBoxes = pantry.boxes_for_sale - Math.floor(eggs / 10);

  if (newLoose < 0) {
    newLoose += 10;
    newSaleBoxes -= 1;
  }

  if (newSaleBoxes < 0) {
    newLoose += newSaleBoxes * 10;
    newSaleBoxes = 0;
  }

  return { newSaleBoxes, newLoose: Math.max(0, newLoose) };
};

/** Put eggs back into stock: whole tens as boxes for sale, the rest as loose eggs. */
export const returnToPantry = (pantry: SaleStock, eggs: number) => ({
  newSaleBoxes: pantry.boxes_for_sale + Math.floor(eggs / 10),
  newLoose: pantry.loose_eggs + (eggs % 10),
});

/** Change pantry stock by a sale's egg difference: positive takes eggs out, negative puts them back. */
export async function adjustPantryForSale(isDemo: boolean, eggsTakenDelta: number): Promise<void> {
  if (eggsTakenDelta === 0) return;
  const apply = (p: SaleStock) =>
    eggsTakenDelta > 0 ? takeFromPantry(p, eggsTakenDelta) : returnToPantry(p, -eggsTakenDelta);

  if (isDemo) {
    const pantry = demoStore.getPantry();
    const { newSaleBoxes, newLoose } = apply(pantry);
    demoStore.setPantry({ ...pantry, boxes_for_sale: newSaleBoxes, loose_eggs: newLoose });
    return;
  }

  const { data, error } = await supabase
    .from('pantry_inventory')
    .select('*')
    .order('last_updated', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const { newSaleBoxes, newLoose } = apply({
    boxes_for_sale: data?.boxes_for_sale || 0,
    loose_eggs: data?.loose_eggs || 0,
  });
  const { error: insertError } = await supabase.from('pantry_inventory').insert([
    { boxes_for_sale: newSaleBoxes, boxes_personal: data?.boxes_personal || 0, loose_eggs: newLoose },
  ]);
  if (insertError) throw insertError;
}

// ---------- Ledger ----------

/**
 * Find the income entry a paid sale created. There's no link in the database, so match on
 * date, amount, category and the "Sold N eggs to X" description. Returns null if none matches.
 */
export async function findSaleIncome(isDemo: boolean, sale: SaleEntry): Promise<number | null> {
  const description = saleIncomeDescription(sale.amountBoxes, sale.customerName);

  if (isDemo) {
    const match = demoStore
      .getTransactions()
      .find(
        (t) =>
          t.type === 'income' &&
          t.category === EGG_SALES_CATEGORY &&
          t.date === sale.date &&
          t.description === description &&
          Math.abs(t.amount - sale.price) < 0.005
      );
    return match?.id ?? null;
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount')
    .eq('type', 'income')
    .eq('category', EGG_SALES_CATEGORY)
    .eq('date', sale.date)
    .eq('description', description)
    .order('id', { ascending: true });
  if (error) throw error;
  const match = (data ?? []).find((t) => Math.abs(Number(t.amount) - sale.price) < 0.005);
  return match?.id ?? null;
}

// ---------- Edit / delete ----------

export interface SaleInput {
  customerName: string;
  eggs: number;
  price: number;
  status: SaleEntry['status'];
  date: string;
}

/** Whether the ledger could be kept in sync (false = no matching income entry was found). */
export interface SaleChangeResult {
  ledgerSynced: boolean;
}

export async function updateSale(isDemo: boolean, old: SaleEntry, next: SaleInput): Promise<SaleChangeResult> {
  const id = Number(old.id);
  const saleFields = {
    customer_name: next.customerName,
    amount_boxes: next.eggs / 10,
    price: next.price,
    status: next.status,
    date: next.date,
  };

  // Look up the old income entry before anything changes.
  const hadIncome = hasIncome(old.status, old.price);
  const needsIncome = hasIncome(next.status, next.price);
  const incomeId = hadIncome ? await findSaleIncome(isDemo, old) : null;
  const incomeFields = {
    date: next.date,
    type: 'income' as const,
    category: EGG_SALES_CATEGORY,
    description: saleIncomeDescription(next.eggs, next.customerName),
    amount: next.price,
  };

  // 1. The sale itself
  if (isDemo) {
    demoStore.updateSale(id, saleFields);
  } else {
    const { error } = await supabase.from('sales').update(saleFields).eq('id', id);
    if (error) throw error;
  }

  // 2. Pantry: take out (or put back) the difference in eggs
  await adjustPantryForSale(isDemo, next.eggs - old.amountBoxes);

  // 3. Ledger
  let ledgerSynced = true;
  if (hadIncome && incomeId === null) {
    ledgerSynced = false; // can't tell which entry it was — leave the ledger alone
  } else if (hadIncome && incomeId !== null && needsIncome) {
    if (isDemo) demoStore.updateTransaction(incomeId, incomeFields);
    else {
      const { error } = await supabase.from('transactions').update(incomeFields).eq('id', incomeId);
      if (error) throw error;
    }
  } else if (hadIncome && incomeId !== null && !needsIncome) {
    if (isDemo) demoStore.deleteTransaction(incomeId);
    else {
      const { error } = await supabase.from('transactions').delete().eq('id', incomeId);
      if (error) throw error;
    }
  } else if (!hadIncome && needsIncome) {
    if (isDemo) demoStore.addTransaction(incomeFields);
    else {
      const { error } = await supabase.from('transactions').insert([incomeFields]);
      if (error) throw error;
    }
  }

  return { ledgerSynced };
}

export async function deleteSale(isDemo: boolean, sale: SaleEntry): Promise<SaleChangeResult> {
  const id = Number(sale.id);
  const incomeId = hasIncome(sale.status, sale.price) ? await findSaleIncome(isDemo, sale) : null;

  if (isDemo) {
    demoStore.deleteSale(id);
  } else {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
  }

  // Put the eggs back.
  await adjustPantryForSale(isDemo, -sale.amountBoxes);

  if (incomeId !== null) {
    if (isDemo) demoStore.deleteTransaction(incomeId);
    else {
      const { error } = await supabase.from('transactions').delete().eq('id', incomeId);
      if (error) throw error;
    }
  }

  return { ledgerSynced: !hasIncome(sale.status, sale.price) || incomeId !== null };
}
