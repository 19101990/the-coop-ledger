import { useEffect, useState } from 'react';
import type { TransactionEntry } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import NetResultCard from '../components/NetResultCard';
import PantrySection from '../components/PantrySection';
import { Card, EmptyState, ScopeToggle, Section } from '../components/ui';
import { rowDivider } from '../components/uiStyles';
import {
  categoryCode,
  formatDayMonth,
  formatDayMonthMaybeYear,
  formatEUR,
  formatMonthLong,
  formatSignedEUR,
  monthRange,
  type YearMonth,
} from '../utils/format';
import { logTotal, todayISO } from '../utils/eggs';

interface OverviewProps {
  month: YearMonth;
  /** Switch to the Ledger tab. */
  onViewLedger: () => void;
}

interface OverviewSale {
  customer_name: string;
  amount_boxes: number | string;
  price: number | string;
  status: 'Paid' | 'Gift';
  date: string;
}

interface OverviewData {
  transactions: TransactionEntry[];
  sales: OverviewSale[];
  monthEggs: number;
  eggsToday: number;
  /** Active hens, or null if unknown. */
  hens: number | null;
}

const EGG_COLUMNS = 'date, eggs_chocolate, eggs_brown, eggs_beige, eggs_white, eggs_olive, eggs_blue, eggs_nato, eggs_perlhuhn';

async function loadOverview(isDemo: boolean, month: YearMonth): Promise<OverviewData> {
  const { from, to } = monthRange(month);
  const today = todayISO();

  // 🛑 DEMO MODE — sample data only
  if (isDemo) {
    return {
      transactions: demoStore.getTransactions().filter((t) => t.date >= from && t.date < to),
      sales: demoStore.getSalesBetween(from, to),
      monthEggs: demoStore.getDailyLogsBetween(from, to).reduce((sum, l) => sum + logTotal(l), 0),
      eggsToday: demoStore.getDailyLogsSince(today).filter((l) => l.date === today).reduce((sum, l) => sum + logTotal(l), 0),
      hens: demoStore.getFlock().filter((b) => b.status === 'Active' && b.sex === 'Hen').length,
    };
  }

  // 🟢 LIVE MODE
  const [txRes, salesRes, logsRes, todayRes, hensRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, date, type, category, description, amount')
      .gte('date', from)
      .lt('date', to)
      .order('date', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('sales').select('customer_name, amount_boxes, price, status, date').gte('date', from).lt('date', to),
    supabase.from('daily_log').select(EGG_COLUMNS).gte('date', from).lt('date', to),
    supabase.from('daily_log').select(EGG_COLUMNS).eq('date', today),
    supabase.from('flock_members').select('id', { count: 'exact', head: true }).eq('status', 'Active').eq('sex', 'Hen'),
  ]);

  for (const res of [txRes, salesRes, logsRes, todayRes]) {
    if (res.error) throw res.error;
  }
  if (hensRes.error) console.error('Could not count hens:', hensRes.error.message);

  return {
    transactions: (txRes.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
    sales: salesRes.data ?? [],
    monthEggs: (logsRes.data ?? []).reduce((sum, l) => sum + logTotal(l), 0),
    eggsToday: (todayRes.data ?? []).reduce((sum, l) => sum + logTotal(l), 0),
    hens: hensRes.error ? null : hensRes.count ?? null,
  };
}

const CUSTOMERS_COLLAPSED = 5;

export default function Overview({ month, onViewLedger }: OverviewProps) {
  const { isDemo } = useDemo();
  const monthKey = `${month.year}-${month.month}`;

  // Data is tagged with the month it belongs to, so a stale response never shows under a new month.
  const [loaded, setLoaded] = useState<{ key: string; data: OverviewData } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOverview(isDemo, month)
      .then((data) => {
        if (!cancelled) {
          setLoaded({ key: monthKey, data });
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load overview:', err);
        if (!cancelled) setError('Could not load this month.');
      });
    return () => {
      cancelled = true;
    };
    // `month` is fully described by monthKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, monthKey]);

  const data = loaded?.key === monthKey ? loaded.data : null;
  const monthName = formatMonthLong(month);

  return (
    <PageContainer>
      {!data ? (
        <LoadingSpinner message={error ?? 'Loading overview…'} size="md" />
      ) : (
        <OverviewContent data={data} monthName={monthName} onViewLedger={onViewLedger} />
      )}

      {/* Outside the month-loading branch so they stay mounted across month switches:
          each keeps its month / all-time choice and loads all-time data only once. */}
      <CategoriesSection monthTransactions={data?.transactions ?? null} monthName={monthName} />
      <CustomersSection monthSales={data?.sales ?? null} monthName={monthName} />
    </PageContainer>
  );
}

function OverviewContent({
  data,
  monthName,
  onViewLedger,
}: {
  data: OverviewData;
  monthName: string;
  onViewLedger: () => void;
}) {
  const { transactions, monthEggs, eggsToday, hens } = data;

  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const stats = [
    { label: 'Eggs today', value: String(eggsToday) },
    { label: 'Lay rate', value: hens ? `${Math.round((eggsToday / hens) * 100)}%` : '—' },
    { label: 'Cost / egg', value: monthEggs ? formatEUR(expense / monthEggs) : '—' },
  ];

  return (
    <>
      <NetResultCard periodLabel={monthName} income={income} expense={expense} />

      <PantrySection />

      <section className="grid grid-cols-3 rounded-xl border border-line bg-surface">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex flex-col gap-1 p-3.5 ${i ? 'border-l border-line' : ''}`}>
            <span className="text-[11px] text-muted">{s.label}</span>
            <span className="font-mono text-xl font-medium tabular-nums">{s.value}</span>
          </div>
        ))}
      </section>

      <Section title="Recent entries" action={{ label: 'View ledger →', onClick: onViewLedger }}>
        <Card padded={false}>
          {transactions.length === 0 ? (
            <EmptyState>No entries this month.</EmptyState>
          ) : (
            transactions.slice(0, 5).map((t) => (
              <div key={t.id} className={`flex items-center gap-3 px-3.5 py-3 ${rowDivider}`}>
                <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-subtle font-mono text-[11px] text-ink-soft">
                  {categoryCode(t.category)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{t.description || t.category}</span>
                  <span className="text-xs text-muted">
                    {t.category} · {formatDayMonth(t.date)}
                  </span>
                </div>
                <span className={`font-mono text-sm tabular-nums ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {formatSignedEUR(t.type === 'income' ? t.amount : -t.amount)}
                </span>
              </div>
            ))
          )}
        </Card>
      </Section>

    </>
  );
}

// ---------- Month / all-time sections ----------

/** Period shown by a section with its own switch: the header month, or everything. */
type Scope = 'month' | 'all';

const scopeOptions = (monthName: string) => [
  { value: 'month' as const, label: monthName },
  { value: 'all' as const, label: 'All time' },
];

/** Load every row of a query. Supabase caps a request at 1000 rows, so fetch in pages. */
async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/**
 * Data that doesn't depend on the month, loaded once per mode.
 * Lives in sections rendered outside the month-loading branch, so it survives month switches.
 */
function useAllTime<T>(load: (isDemo: boolean) => Promise<T[]>, what: string) {
  const { isDemo } = useDemo();
  const [rows, setRows] = useState<T[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load(isDemo)
      .then((r) => !cancelled && setRows(r))
      .catch((err) => {
        console.error(`Failed to load all-time ${what}:`, err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // `load` is a module-level function; only the mode matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  return { rows, failed };
}

// ---------- Categories ----------

type CategoryTx = Pick<TransactionEntry, 'type' | 'category' | 'amount'>;

async function loadAllTransactions(isDemo: boolean): Promise<CategoryTx[]> {
  if (isDemo) return demoStore.getTransactions();
  const rows = await fetchAllPages<CategoryTx>((from, to) =>
    supabase.from('transactions').select('type, category, amount').order('id', { ascending: true }).range(from, to)
  );
  return rows.map((t) => ({ ...t, amount: Number(t.amount) }));
}

function CategoriesSection({ monthTransactions, monthName }: { monthTransactions: CategoryTx[] | null; monthName: string }) {
  // Starts on the month, matching the net result card above.
  const [scope, setScope] = useState<Scope>('month');
  const allTime = useAllTime(loadAllTransactions, 'transactions');

  const transactions = scope === 'all' ? allTime.rows : monthTransactions;

  // Categories that had entries in the period, grouped by type, largest first.
  const group = (type: CategoryTx['type'], label: string) => {
    const totals: Record<string, number> = {};
    (transactions ?? []).filter((t) => t.type === type).forEach((t) => (totals[t.category] = (totals[t.category] || 0) + t.amount));
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return { type, label, rows, total: rows.reduce((sum, [, v]) => sum + v, 0) };
  };
  const groups = [group('income', 'Income'), group('expense', 'Expenses')].filter((g) => g.rows.length > 0);
  // One scale for every bar, so income and expense categories can be compared directly.
  const max = Math.max(1, ...groups.flatMap((g) => g.rows.map(([, v]) => v)));

  return (
    <Section
      title="Categories"
      control={<ScopeToggle label="Categories period" options={scopeOptions(monthName)} value={scope} onChange={setScope} />}
    >
      <Card padded={false}>
        {!transactions ? (
          scope === 'all' && allTime.failed ? (
            <EmptyState>Could not load categories.</EmptyState>
          ) : (
            <LoadingSpinner message="Loading categories…" size="sm" />
          )
        ) : groups.length === 0 ? (
          <EmptyState>{scope === 'all' ? 'No entries yet.' : `No entries in ${monthName}.`}</EmptyState>
        ) : (
          groups.map((g) => (
            <div key={g.type} className={`flex flex-col gap-3 p-3.5 ${rowDivider}`}>
              <div className="flex items-baseline justify-between text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-xs ${g.type === 'income' ? 'bg-income' : 'bg-expense'}`} />
                  {g.label}
                </span>
                <span className={`font-mono tabular-nums ${g.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {formatSignedEUR(g.type === 'income' ? g.total : -g.total)}
                </span>
              </div>
              {g.rows.map(([name, value]) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[13px]">
                    <span>{name}</span>
                    <span className="font-mono tabular-nums">{formatEUR(value)}</span>
                  </div>
                  <div className="h-1 rounded-sm bg-subtle">
                    <div
                      className={`h-1 rounded-sm ${g.type === 'income' ? 'bg-income' : 'bg-expense'}`}
                      style={{ width: `${(value / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </Card>
    </Section>
  );
}

// ---------- Customers ----------

async function loadAllPaidSales(isDemo: boolean): Promise<OverviewSale[]> {
  if (isDemo) return demoStore.getAllSales().filter((s) => s.status === 'Paid');
  return fetchAllPages<OverviewSale>((from, to) =>
    supabase
      .from('sales')
      .select('customer_name, amount_boxes, price, status, date')
      .eq('status', 'Paid')
      .order('id', { ascending: true })
      .range(from, to)
  );
}

/** Customers ranked by spend: paid sales only (gifts excluded). */
function summariseCustomers(sales: OverviewSale[]) {
  const map: Record<string, { name: string; spent: number; eggs: number; last: string }> = {};
  sales
    .filter((s) => s.status === 'Paid')
    .forEach((s) => {
      const c = (map[s.customer_name] ??= { name: s.customer_name, spent: 0, eggs: 0, last: '' });
      c.spent += Number(s.price) || 0;
      c.eggs += Math.round((Number(s.amount_boxes) || 0) * 10);
      if (s.date > c.last) c.last = s.date;
    });
  return Object.values(map).sort((a, b) => b.spent - a.spent || b.eggs - a.eggs);
}

function CustomersSection({ monthSales, monthName }: { monthSales: OverviewSale[] | null; monthName: string }) {
  // Starts on all time.
  const [scope, setScope] = useState<Scope>('all');
  const [showAll, setShowAll] = useState(false);
  const allTime = useAllTime(loadAllPaidSales, 'sales');

  const sales = scope === 'all' ? allTime.rows : monthSales;
  const customers = sales ? summariseCustomers(sales) : [];
  const topSpend = customers[0]?.spent || 1;
  const visible = showAll ? customers : customers.slice(0, CUSTOMERS_COLLAPSED);

  return (
    <Section
      title="Customers"
      control={<ScopeToggle label="Customers period" options={scopeOptions(monthName)} value={scope} onChange={setScope} />}
    >
      <Card padded={false}>
        {!sales ? (
          scope === 'all' && allTime.failed ? (
            <EmptyState>Could not load customers.</EmptyState>
          ) : (
            <LoadingSpinner message="Loading customers…" size="sm" />
          )
        ) : customers.length === 0 ? (
          <EmptyState>{scope === 'all' ? 'No paid sales yet.' : `No paid sales in ${monthName}.`}</EmptyState>
        ) : (
          <>
            {visible.map((c) => (
              <div key={c.name} className={`grid grid-cols-[minmax(0,1fr)_64px_68px] items-center gap-3 px-3.5 py-2 ${rowDivider}`}>
                <div className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-[13px] font-medium">{c.name}</span>
                  <span className="truncate text-[11px] text-muted">
                    Last {formatDayMonthMaybeYear(c.last)} · {c.eggs} eggs
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-sm bg-subtle">
                  <div className="h-1 rounded-sm bg-income" style={{ width: `${(c.spent / topSpend) * 100}%` }} />
                </div>
                <span className="text-right font-mono text-[13px] text-income tabular-nums">{formatEUR(c.spent)}</span>
              </div>
            ))}
            {customers.length > CUSTOMERS_COLLAPSED && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="h-10 w-full cursor-pointer border-t border-divider bg-transparent text-[13px] text-muted hover:bg-app hover:text-ink"
              >
                {showAll ? `Show top ${CUSTOMERS_COLLAPSED}` : `Show all ${customers.length}`}
              </button>
            )}
          </>
        )}
      </Card>
    </Section>
  );
}
