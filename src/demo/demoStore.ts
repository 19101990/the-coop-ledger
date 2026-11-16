/**
 * Demo sandbox data store.
 *
 * Everything shown in demo mode comes from here — never from Supabase.
 * Data is seeded with fictional records and persisted to localStorage so
 * visitors can play with the app; if storage is unavailable it falls back
 * to an in-memory copy for the current session.
 */
import type {
  DBLogEntry,
  FlockMember,
  TransactionCategory,
  TransactionEntry,
} from '../types/types';

export interface DemoSale {
  id: number;
  customer_name: string;
  amount_boxes: number;
  price: number;
  status: 'Paid' | 'Gift';
  date: string;
}

export interface DemoPantry {
  boxes_for_sale: number;
  boxes_personal: number;
  loose_eggs: number;
}

export interface DemoLegacyYear {
  year: number;
  eggs_collected: number;
  eggs_sold: number;
  revenue: number;
}

interface DemoData {
  customers: string[];
  sales: DemoSale[];
  dailyLogs: DBLogEntry[];
  pantry: DemoPantry;
  transactions: TransactionEntry[];
  categories: TransactionCategory[];
  breeds: string[];
  flock: FlockMember[];
  legacy: DemoLegacyYear[];
}

// Bump the version when the seed changes so existing visitors get the new sample data.
const STORAGE_KEY = 'coop_demo_data_v2';
// Keys used by earlier demo versions; cleared on reset.
const LEGACY_KEYS = ['coop_demo_data_v1', 'demo_customers', 'demo_sales_ledger', 'demo_transactions', 'demo_daily_logs'];

// ---------- Seed generation ----------

// Small deterministic PRNG so the seed looks the same on every fresh load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

function buildSeed(): DemoData {
  const rand = mulberry32(42);
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  const customers = ['Walk-in Customer', 'Anna Example', 'Ben Sample', 'Café Muster', 'Clara Demo', 'Neighbor Farm Shop'];

  const notes = [
    'Sunny day, hens very active.',
    'Rainy morning, a few eggs in the hay.',
    'Cleaned the coop and replaced bedding.',
    null, null, null,
  ];

  const dailyLogs: DBLogEntry[] = [];
  for (let i = 0; i < 45; i++) {
    const date = isoDaysAgo(i);
    dailyLogs.push({
      id: 10_000 + i,
      created_at: `${date}T18:00:00.000Z`,
      date,
      // At most one egg per hen per day, matching the sample flock below:
      // 2 Maran (chocolate), 2 Leghorn (white), Araucana (blue), Sussex (beige), Orpington (brown).
      eggs_chocolate: int(0, 2),
      eggs_brown: int(0, 1),
      eggs_beige: int(0, 1),
      eggs_white: int(1, 2),
      eggs_olive: 0,
      eggs_blue: int(0, 1),
      eggs_nato: 0,
      eggs_perlhuhn: 0,
      boxes_for_sale: rand() < 0.3 ? 1 : 0,
      boxes_personal: rand() < 0.1 ? 1 : 0,
      notes: notes[int(0, notes.length - 1)],
    });
  }

  const sales: DemoSale[] = [];
  const transactions: TransactionEntry[] = [];
  for (let i = 0; i < 18; i++) {
    const date = isoDaysAgo(i * 2 + int(0, 1));
    const eggs = [6, 6, 10, 10, 12, 12][int(0, 5)];
    const isGift = rand() < 0.15;
    const price = isGift ? 0 : eggs * 0.5;
    const customer = customers[int(0, customers.length - 1)];
    sales.push({ id: 20_000 + i, customer_name: customer, amount_boxes: eggs / 10, price, status: isGift ? 'Gift' : 'Paid', date });
    if (!isGift) {
      transactions.push({
        id: 30_000 + i,
        date,
        type: 'income',
        category: 'Egg Sales',
        description: `Sold ${eggs} eggs to ${customer}`,
        amount: price,
      });
    }
  }

  const expenses: Array<[string, string, number]> = [
    ['Food', 'Layer pellets 25kg', 18.9],
    ['Bedding', 'Straw bales', 12.0],
    ['Food', 'Grit and oyster shell', 9.5],
    ['Veterinary', 'Mite treatment', 14.25],
    ['Equipment', 'New waterer', 22.0],
    ['Food', 'Layer pellets 25kg', 18.9],
  ];
  expenses.forEach(([category, description, amount], i) => {
    transactions.push({ id: 31_000 + i, date: isoDaysAgo(i * 7 + 3), type: 'expense', category, description, amount });
  });
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  const categories: TransactionCategory[] = [
    { id: 1, name: 'Egg Sales', type: 'income' },
    { id: 2, name: 'Other Income', type: 'income' },
    { id: 3, name: 'Food', type: 'expense' },
    { id: 4, name: 'Bedding', type: 'expense' },
    { id: 5, name: 'Veterinary', type: 'expense' },
    { id: 6, name: 'Equipment', type: 'expense' },
  ];

  const breeds = ['Araucana', 'Leghorn', 'Maran', 'Orpington', 'Sussex'];

  const bird = (
    id: number, breed: string, sex: 'Hen' | 'Rooster', name: string | null, birth_year: number,
    extra: Partial<FlockMember> = {},
  ): FlockMember => ({
    id, breed, sex, name, birth_year,
    hatch_date: null, color: null, band_number: String(100 + id), notes: null,
    status: 'Active', archive_date: null, archive_reason: null,
    ...extra,
  });

  const flock: FlockMember[] = [
    bird(1, 'Maran', 'Hen', 'Hazel', 2023, { color: 'Black copper' }),
    bird(2, 'Maran', 'Hen', 'Mocha', 2024),
    bird(3, 'Araucana', 'Hen', 'Skye', 2023, { color: 'Blue' }),
    bird(4, 'Leghorn', 'Hen', 'Snow', 2022, { notes: 'Most reliable layer.' }),
    bird(5, 'Leghorn', 'Hen', null, 2024),
    bird(6, 'Sussex', 'Hen', 'Pepper', 2023, { color: 'Light' }),
    bird(7, 'Orpington', 'Hen', 'Goldie', 2024, { color: 'Buff' }),
    bird(8, 'Orpington', 'Rooster', 'Duke', 2023, { color: 'Buff' }),
    bird(9, 'Sussex', 'Hen', 'Dot', 2021, {
      status: 'Archived', archive_date: isoDaysAgo(60), archive_reason: 'Retired to a friend\'s garden',
    }),
  ];

  const thisYear = new Date().getFullYear();
  const legacy: DemoLegacyYear[] = [
    { year: thisYear - 3, eggs_collected: 4120, eggs_sold: 2650, revenue: 1325 },
    { year: thisYear - 2, eggs_collected: 4580, eggs_sold: 3010, revenue: 1505 },
    { year: thisYear - 1, eggs_collected: 4890, eggs_sold: 3240, revenue: 1620 },
  ];

  return {
    customers,
    sales: sales.sort((a, b) => b.date.localeCompare(a.date)),
    dailyLogs,
    pantry: { boxes_for_sale: 6, boxes_personal: 2, loose_eggs: 14 },
    transactions,
    categories,
    breeds,
    flock,
    legacy,
  };
}

// ---------- Persistence ----------

let memory: DemoData | null = null;

function read(): DemoData {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memory = { ...buildSeed(), ...JSON.parse(raw) } as DemoData;
      return memory;
    }
  } catch {
    // Storage unavailable or corrupted — fall through to a fresh seed.
  }
  memory = buildSeed();
  write(memory);
  return memory;
}

function write(data: DemoData) {
  memory = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Keep the in-memory copy only.
  }
}

function update<K extends keyof DemoData>(key: K, fn: (current: DemoData[K]) => DemoData[K]): DemoData[K] {
  const data = read();
  const next = fn(data[key]);
  write({ ...data, [key]: next });
  return next;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const nextId = () => Date.now() + Math.floor(Math.random() * 1000);

// ---------- Public API ----------

export const demoStore = {
  reset() {
    memory = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    read();
  },

  // Customers
  getCustomers: (): string[] => [...read().customers].sort((a, b) => a.localeCompare(b)),
  addCustomer: (name: string) => update('customers', list => [...list, name]),

  // Sales
  getRecentSales: (limit = 10): DemoSale[] =>
    clone(read().sales).sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit),
  getSalesSince: (date: string): DemoSale[] => clone(read().sales.filter(s => s.date >= date)),
  getAllSales: (): DemoSale[] => clone(read().sales),
  /** Sales with from <= date < to (YYYY-MM-DD). */
  getSalesBetween: (from: string, to: string): DemoSale[] =>
    clone(read().sales.filter(s => s.date >= from && s.date < to)),
  addSale(sale: Omit<DemoSale, 'id'>): DemoSale {
    const entry = { id: nextId(), ...sale };
    update('sales', list => [entry, ...list]);
    return entry;
  },
  updateSale: (id: number, patch: Partial<Omit<DemoSale, 'id'>>) =>
    update('sales', list => list.map(s => (s.id === id ? { ...s, ...patch } : s))),
  deleteSale: (id: number) => update('sales', list => list.filter(s => s.id !== id)),

  // Daily logs
  getDailyLogs(from: number, to: number): DBLogEntry[] {
    return clone(read().dailyLogs)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(from, to + 1);
  },
  getDailyLogsSince: (date: string): DBLogEntry[] => clone(read().dailyLogs.filter(l => l.date >= date)),
  addDailyLog(log: Omit<DBLogEntry, 'id' | 'created_at'>): DBLogEntry {
    const entry: DBLogEntry = { id: nextId(), created_at: new Date().toISOString(), ...log };
    update('dailyLogs', list => [entry, ...list]);
    return entry;
  },
  updateDailyLog: (id: number, patch: Partial<DBLogEntry>) =>
    update('dailyLogs', list => list.map(l => (l.id === id ? { ...l, ...patch } : l))),
  deleteDailyLog: (id: number) => update('dailyLogs', list => list.filter(l => l.id !== id)),

  // Pantry
  getPantry: (): DemoPantry => clone(read().pantry),
  setPantry: (pantry: DemoPantry) => update('pantry', () => pantry),

  // Transactions
  getCategories: (): TransactionCategory[] => clone(read().categories),
  getTransactions: (): TransactionEntry[] =>
    clone(read().transactions).sort((a, b) => b.date.localeCompare(a.date)),
  addTransaction(tx: Omit<TransactionEntry, 'id'>): TransactionEntry {
    const entry = { id: nextId(), ...tx };
    update('transactions', list => [entry, ...list]);
    return entry;
  },
  updateTransaction: (id: number, patch: Partial<Omit<TransactionEntry, 'id'>>) =>
    update('transactions', list => list.map(t => (t.id === id ? { ...t, ...patch } : t))),
  deleteTransaction: (id: number) => update('transactions', list => list.filter(t => t.id !== id)),

  // Flock
  getBreeds: (): string[] => [...read().breeds].sort((a, b) => a.localeCompare(b)),
  addBreed: (name: string) => update('breeds', list => [...list, name]),
  getFlock: (): FlockMember[] => clone(read().flock),
  setFlock: (flock: FlockMember[]) => update('flock', () => flock),

  // Reports
  getLegacyYears: (): DemoLegacyYear[] => clone(read().legacy),
};
