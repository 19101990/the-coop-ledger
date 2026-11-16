import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import LoadingSpinner from '../components/LoadingSpinner';
import PageContainer from '../components/PageContainer';

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

  return (
    <PageContainer>
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">📊 Comprehensive Yearly Ledger</h2>
          <p className="text-xs text-stone-500">Unified view combining legacy metrics and dynamic app data</p>
        </div>

        {loading ? (
          <LoadingSpinner message="Calculating historical and real-time matrix totals..." size="sm" />
        ) : yearlyReport.length === 0 ? (
          <div className="text-stone-400 text-xs py-4">
            No production records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 font-semibold uppercase tracking-wider">
                  <th className="pb-2 text-[9px]">Year</th>
                  <th className="pb-2 text-center text-[9px]">Amount</th>
                  <th className="pb-2 text-center text-[9px]">Sold</th>
                  <th className="pb-2 text-right text-[9px]">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {yearlyReport.map((row) => (
                  <tr key={row.year} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 font-bold text-stone-900 valign-middle">
                      <div className="flex items-center gap-2">
                        <span>{row.year}</span>
                        {row.isLegacy && (
                          <span className="text-[9px] bg-stone-100 text-stone-600 font-medium px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                            Legacy
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-center text-stone-600">{row.eggs_collected.toLocaleString()}</td>
                    <td className="py-3 text-center text-stone-600">{row.eggs_sold.toLocaleString()}</td>
                    <td className="py-3 text-right font-bold text-stone-900">
                      €{row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
