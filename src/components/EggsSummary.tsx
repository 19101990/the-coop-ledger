import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import EggChart from './EggChart';
import LoadingSpinner from './LoadingSpinner';
import { Card, ScopeToggle, Section, StatCard } from './ui';
import { formatDayMonth, formatEUR } from '../utils/format';
import { logTotal, todayISO } from '../utils/eggs';
import { buildEggSeries, periodStart, type EggPeriod } from '../utils/eggChart';
import { fetchAllPages } from '../utils/supabasePaging';

const EGG_COLUMNS = 'date, eggs_chocolate, eggs_brown, eggs_beige, eggs_white, eggs_olive, eggs_blue, eggs_nato, eggs_perlhuhn';

interface EggsData {
  /** Eggs collected per date (several logs on one day are added up). */
  dailyTotals: Map<string, number>;
  /** Active hens, or null if unknown. */
  hens: number | null;
  /** Paid sales revenue this month. */
  monthRevenue: number;
}

async function loadEggsData(isDemo: boolean, today: string): Promise<EggsData> {
  // One load covers every chart period: the longest one is 12 months.
  const since = periodStart('12m', today);
  const monthStart = `${today.slice(0, 7)}-01`;

  const toTotals = (logs: Array<{ date: string } & Parameters<typeof logTotal>[0]>) => {
    const totals = new Map<string, number>();
    logs.forEach((l) => totals.set(l.date, (totals.get(l.date) ?? 0) + logTotal(l)));
    return totals;
  };

  // 🛑 DEMO MODE — sample data only
  if (isDemo) {
    return {
      dailyTotals: toTotals(demoStore.getDailyLogsSince(since)),
      hens: demoStore.getFlock().filter((b) => b.status === 'Active' && b.sex === 'Hen').length,
      monthRevenue: demoStore
        .getSalesSince(monthStart)
        .filter((s) => s.status === 'Paid')
        .reduce((sum, s) => sum + s.price, 0),
    };
  }

  // 🟢 LIVE MODE
  const [logs, hensRes, salesRes] = await Promise.all([
    fetchAllPages<{ date: string }>((from, to) =>
      supabase.from('daily_log').select(EGG_COLUMNS).gte('date', since).order('date').range(from, to)
    ),
    supabase.from('flock_members').select('id', { count: 'exact', head: true }).eq('status', 'Active').eq('sex', 'Hen'),
    supabase.from('sales').select('price').eq('status', 'Paid').gte('date', monthStart),
  ]);
  if (salesRes.error) throw salesRes.error;
  if (hensRes.error) console.error('Could not count hens:', hensRes.error.message);

  return {
    dailyTotals: toTotals(logs),
    hens: hensRes.error ? null : hensRes.count ?? null,
    monthRevenue: (salesRes.data ?? []).reduce((sum, s) => sum + (Number(s.price) || 0), 0),
  };
}

/** Top of the Eggs tab: today's count, the laying chart and this month's figures. */
export default function EggsSummary({ onAdd }: { onAdd: () => void }) {
  const { isDemo } = useDemo();
  const [data, setData] = useState<EggsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<EggPeriod>('14d');
  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    loadEggsData(isDemo, today)
      .then((d) => !cancelled && setData(d))
      .catch((err) => {
        console.error('Failed to load egg stats:', err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo, today]);

  if (!data) {
    return <LoadingSpinner message={failed ? 'Could not load egg stats.' : 'Loading egg stats…'} size="sm" />;
  }

  const eggsToday = data.dailyTotals.get(today) ?? 0;
  const monthPrefix = today.slice(0, 7);
  let monthEggs = 0;
  data.dailyTotals.forEach((n, date) => {
    if (date.startsWith(monthPrefix)) monthEggs += n;
  });
  const series = buildEggSeries(data.dailyTotals, period, today);

  return (
    <>
      <section className="flex flex-col items-center gap-2 rounded-[14px] border border-line bg-surface p-5">
        <span className="text-[13px] text-muted">Collected today · {formatDayMonth(today)}</span>
        <span className="font-mono text-[56px] leading-none font-medium tracking-[-.04em] tabular-nums">{eggsToday}</span>
        <span className="text-xs text-muted">
          {data.hens === null
            ? 'Hen count unavailable'
            : `${data.hens} hen${data.hens === 1 ? '' : 's'} · ${data.hens ? Math.round((eggsToday / data.hens) * 100) : 0}% lay rate`}
        </span>
        {/* Same action as the + in the bottom bar: opens the daily log sheet. */}
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 h-11 cursor-pointer rounded-lg bg-ink px-5 text-sm font-medium text-app active:bg-ink-pressed"
        >
          + Add entry
        </button>
      </section>

      <Section
        title="Laying"
        control={
          <ScopeToggle
            label="Chart period"
            options={[
              { value: '14d', label: '14d' },
              { value: '30d', label: '30d' },
              { value: '3m', label: '3m' },
              { value: '12m', label: '12m' },
            ]}
            value={period}
            onChange={setPeriod}
          />
        }
      >
        <Card>
          {/* Keyed by period so a tapped bar doesn't stay selected after switching periods. */}
          <EggChart key={period} series={series} />
        </Card>
        {series.perDay && <span className="px-0.5 text-xs text-muted">Each bar is the average per logged day in that {period === '3m' ? 'week' : 'month'}.</span>}
      </Section>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Eggs this month" value={monthEggs} />
        <StatCard label="Revenue / egg" value={monthEggs ? formatEUR(data.monthRevenue / monthEggs) : '—'} />
      </div>
    </>
  );
}
