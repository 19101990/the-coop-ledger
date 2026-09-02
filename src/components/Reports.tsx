import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface YearlyReportRow {
  year: number;
  eggs_collected: number;
  eggs_sold: number;
  revenue: number;
  isLegacy: boolean;
}

export default function RecordsSummaryPage() {
  const [yearlyReport, setYearlyReport] = useState<YearlyReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buildYearlyReport() {
      try {
        setLoading(true);

        // fetch historical records
        const { data: legacyData, error: legacyError } = await supabase
          .from('legacy_yearly_ledger')
          .select('year, eggs_collected, eggs_sold, revenue');

        if (legacyError) throw legacyError;

        // fetch active log records
        const { data: liveLogs, error: logsError } = await supabase
          .from('daily_log')
          .select(`
            date, 
            eggs_chocolate, 
            eggs_brown, 
            eggs_beige, 
            eggs_olive, 
            eggs_blue, 
            eggs_nato, 
            eggs_perlhuhn
          `)
          .gte('date', '2026-01-01');

        if (logsError) throw logsError;

        // fetch active financial data
        const { data: liveSales, error: salesError } = await supabase
          .from('sales')
          .select('date, amount_boxes, price')
          .gte('date', '2026-01-01');

        if (salesError) throw salesError;

        // group live records by year
        const liveYearGroups: Record<number, { collected: number; sold: number; revenue: number }> = {};

        // live egg collections
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
            (log.eggs_olive || 0) + 
            (log.eggs_blue || 0) + 
            (log.eggs_nato || 0) + 
            (log.eggs_perlhuhn || 0);

          liveYearGroups[year].collected += dailyCollection;
        });

        // live sales from sales table
        liveSales?.forEach((sale) => {
          if (!sale.date) return;
          const year = new Date(sale.date).getFullYear();

          if (!liveYearGroups[year]) {
            liveYearGroups[year] = { collected: 0, sold: 0, revenue: 0 };
          }

          // box quantities into a total piece count
          const eggsSoldInBoxes = Math.round((Number(sale.amount_boxes) || 0) * 10);

          liveYearGroups[year].sold += eggsSoldInBoxes;
          liveYearGroups[year].revenue += (Number(sale.price) || 0);
        });

        // format legacy entries
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

        // merge and sort
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
  }, []);

  return (
    <div className="space-y-6 p-4">
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-stone-900">📊 Comprehensive Yearly Ledger</h3>
          <p className="text-xs text-stone-500">Unified view combining legacy metrics and dynamic app data</p>
        </div>

        {loading ? (
          <div className="text-stone-400 text-xs py-4 animate-pulse">
            Calculating historical and real-time matrix totals...
          </div>
        ) : yearlyReport.length === 0 ? (
          <div className="text-stone-400 text-xs py-4">
            No production records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 font-semibold uppercase tracking-wider">
                  <th className="pb-2">Year</th>
                  <th className="pb-2 text-center">Collected</th>
                  <th className="pb-2 text-center">Sold</th>
                  <th className="pb-2 text-right">Revenue</th>
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
    </div>
  );
}