import { useEffect, useState } from 'react';
import type { TransactionEntry } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import NetResultCard from '../components/NetResultCard';
import PantrySection from '../components/PantrySection';
import { Card, EmptyState, Section } from '../components/ui';
import { rowDivider } from '../components/uiStyles';
import {
  categoryCode,
  formatDayMonth,
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
  const [showAllCustomers, setShowAllCustomers] = useState(false);

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
        <OverviewContent
          data={data}
          monthName={monthName}
          onViewLedger={onViewLedger}
          showAllCustomers={showAllCustomers}
          onToggleCustomers={() => setShowAllCustomers((v) => !v)}
        />
      )}
    </PageContainer>
  );
}

function OverviewContent({
  data,
  monthName,
  onViewLedger,
  showAllCustomers,
  onToggleCustomers,
}: {
  data: OverviewData;
  monthName: string;
  onViewLedger: () => void;
  showAllCustomers: boolean;
  onToggleCustomers: () => void;
}) {
  const { transactions, sales, monthEggs, eggsToday, hens } = data;

  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  // Spending by category, largest first; bars are relative to the largest.
  const byCategory = Object.entries(
    transactions
      .filter((t) => t.type === 'expense')
      .reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {})
  ).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(1, ...byCategory.map(([, v]) => v));

  // Customers: paid sales only (gifts excluded), by spend.
  const customerMap: Record<string, { name: string; spent: number; eggs: number; last: string }> = {};
  sales
    .filter((s) => s.status === 'Paid')
    .forEach((s) => {
      const c = (customerMap[s.customer_name] ??= { name: s.customer_name, spent: 0, eggs: 0, last: '' });
      c.spent += Number(s.price) || 0;
      c.eggs += Math.round((Number(s.amount_boxes) || 0) * 10);
      if (s.date > c.last) c.last = s.date;
    });
  const customers = Object.values(customerMap).sort((a, b) => b.spent - a.spent || b.eggs - a.eggs);
  const topSpend = customers[0]?.spent || 1;
  const visibleCustomers = showAllCustomers ? customers : customers.slice(0, CUSTOMERS_COLLAPSED);

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

      <Section title="Spending by category">
        {byCategory.length === 0 ? (
          <Card padded={false}>
            <EmptyState>No expenses this month.</EmptyState>
          </Card>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
            {byCategory.map(([name, value]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[13px]">
                  <span>{name}</span>
                  <span className="font-mono tabular-nums">{formatEUR(value)}</span>
                </div>
                <div className="h-1 rounded-sm bg-subtle">
                  <div className="h-1 rounded-sm bg-ink" style={{ width: `${(value / maxCategory) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Customers" aside={`${customers.length} customer${customers.length === 1 ? '' : 's'} · ${monthName}`}>
        <Card padded={false}>
          {customers.length === 0 ? (
            <EmptyState>No sales this month.</EmptyState>
          ) : (
            <>
              {visibleCustomers.map((c) => (
                <div
                  key={c.name}
                  className={`grid grid-cols-[minmax(0,1fr)_64px_68px] items-center gap-3 px-3.5 py-2 ${rowDivider}`}
                >
                  <div className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-[13px] font-medium">{c.name}</span>
                    <span className="truncate text-[11px] text-muted">
                      Last {formatDayMonth(c.last)} · {c.eggs} eggs
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
                  onClick={onToggleCustomers}
                  className="h-10 w-full cursor-pointer border-t border-divider bg-transparent text-[13px] text-muted hover:bg-app hover:text-ink"
                >
                  {showAllCustomers ? `Show top ${CUSTOMERS_COLLAPSED}` : `Show all ${customers.length}`}
                </button>
              )}
            </>
          )}
        </Card>
      </Section>
    </>
  );
}
