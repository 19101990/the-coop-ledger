import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import LoadingSpinner from '../components/LoadingSpinner';
import PageContainer from '../components/PageContainer';
import { Card, EmptyState, Section } from '../components/ui';
import { rowDivider } from '../components/uiStyles';
import { formatEUR } from '../utils/format';

// Live app data starts here; earlier years come from legacy_yearly_ledger.
const LIVE_DATA_START = '2026-01-01';

type EggColumns = 'eggs_chocolate' | 'eggs_brown' | 'eggs_beige' | 'eggs_white' | 'eggs_olive' | 'eggs_blue' | 'eggs_nato' | 'eggs_perlhuhn';

interface ReportSourceData {
  legacyData: Array<{ year: number; eggs_collected: number; eggs_sold: number; revenue: number }>;
  liveLogs: Array<{ date: string } & Record<EggColumns, number>>;
  liveSales: Array<{ date: string; amount_boxes: number | string; price: number | string }>;
}

interface YearlyReportRow {
  year: number;
  eggs_collected: number;
  eggs_sold: number;
  revenue: number;
  isLegacy: boolean;
}

export default function Reports() {
  const { isDemo } = useDemo();
  const [yearlyReport, setYearlyReport] = useState<YearlyReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSourceData(): Promise<ReportSourceData> {
      // 🛑 DEMO MODE — build the report purely from sample data
      if (isDemo) {
        const since = `${new Date().getFullYear()}-01-01`;
        return {
          legacyData: demoStore.getLegacyYears(),
          liveLogs: demoStore.getDailyLogsSince(since),
          liveSales: demoStore.getSalesSince(since),
        };
      }

      const { data: legacyData, error: legacyError } = await supabase
        .from('legacy_yearly_ledger')
        .select('year, eggs_collected, eggs_sold, revenue');

      if (legacyError) throw legacyError;

      const { data: liveLogs, error: logsError } = await supabase
        .from('daily_log')
        .select(`
          date,
          eggs_chocolate,
          eggs_brown,
          eggs_beige,
          eggs_white,
          eggs_olive,
          eggs_blue,
          eggs_nato,
          eggs_perlhuhn
        `)
        .gte('date', LIVE_DATA_START);

      if (logsError) throw logsError;

      const { data: liveSales, error: salesError } = await supabase
        .from('sales')
        .select('date, amount_boxes, price')
        .gte('date', LIVE_DATA_START);

      if (salesError) throw salesError;

      return { legacyData: legacyData || [], liveLogs: liveLogs || [], liveSales: liveSales || [] };
    }

    async function buildYearlyReport() {
      try {
        setLoading(true);

        const { legacyData, liveLogs, liveSales } = await loadSourceData();

        const liveYearGroups: Record<number, { collected: number; sold: number; revenue: number }> = {};

        liveLogs?.forEach((log) => {
          if (!log.date) return;
          const year = new Date(log.date).getFullYear();

          if (!liveYearGroups[year]) {
            liveYearGroups[year] = { collected: 0, sold: 0, revenue: 0 };
          }

          const dailyCollection =
            (log.eggs_chocolate || 0) +
            (log.eggs_brown || 0) +
            (log.eggs_beige || 0) +
            (log.eggs_white || 0) +
            (log.eggs_olive || 0) +
            (log.eggs_blue || 0) +
            (log.eggs_nato || 0) +
            (log.eggs_perlhuhn || 0);

          liveYearGroups[year].collected += dailyCollection;
        });

        liveSales?.forEach((sale) => {
          if (!sale.date) return;
          const year = new Date(sale.date).getFullYear();

          if (!liveYearGroups[year]) {
            liveYearGroups[year] = { collected: 0, sold: 0, revenue: 0 };
          }

          const eggsSoldInBoxes = Math.round((Number(sale.amount_boxes) || 0) * 10);

          liveYearGroups[year].sold += eggsSoldInBoxes;
          liveYearGroups[year].revenue += (Number(sale.price) || 0);
        });

        const formattedLegacy: YearlyReportRow[] = (legacyData || []).map((row) => ({
          year: row.year,
          eggs_collected: row.eggs_collected,
          eggs_sold: row.eggs_sold,
          revenue: row.revenue,
          isLegacy: true,
        }));

        const formattedLive: YearlyReportRow[] = Object.keys(liveYearGroups).map((yearStr) => {
          const year = Number(yearStr);
          return {
            year,
            eggs_collected: liveYearGroups[year].collected,
            eggs_sold: liveYearGroups[year].sold,
            revenue: liveYearGroups[year].revenue,
            isLegacy: false,
          };
        });

        const combined = [...formattedLive, ...formattedLegacy];
        const combinedSorted = combined.sort((a, b) => Number(b.year) - Number(a.year));

        setYearlyReport(combinedSorted);
      } catch (err) {
        console.error('Error compiling comprehensive yearly ledger report:', err);
      } finally {
        setLoading(false);
      }
    }

    buildYearlyReport();
  }, [isDemo]);

  const nf = new Intl.NumberFormat('nl-NL');

  return (
    <PageContainer>
      <Section title="Yearly ledger" aside="Legacy records + app data">
        <Card padded={false}>
          {loading ? (
            <LoadingSpinner message="Calculating yearly totals…" size="sm" />
          ) : yearlyReport.length === 0 ? (
            <EmptyState>No production records found.</EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_64px_64px_88px] gap-2 border-b border-line px-3.5 py-2.5 font-mono text-[10px] tracking-[.08em] text-muted uppercase">
                <span>Year</span>
                <span className="text-right">Eggs</span>
                <span className="text-right">Sold</span>
                <span className="text-right">Revenue</span>
              </div>
              {yearlyReport.map((row) => (
                <div
                  key={row.year}
                  className={`grid grid-cols-[minmax(0,1fr)_64px_64px_88px] items-center gap-2 px-3.5 py-3 ${rowDivider}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{row.year}</span>
                    {row.isLegacy && (
                      <span className="rounded bg-subtle px-1.5 py-px text-[10px] text-muted">Legacy</span>
                    )}
                  </span>
                  <span className="text-right font-mono text-[13px] text-ink-soft tabular-nums">{nf.format(row.eggs_collected)}</span>
                  <span className="text-right font-mono text-[13px] text-ink-soft tabular-nums">{nf.format(row.eggs_sold)}</span>
                  <span className="text-right font-mono text-[13px] font-medium tabular-nums">{formatEUR(row.revenue)}</span>
                </div>
              ))}
            </>
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
