import { useState, useEffect, useRef } from 'react';
import type { DBLogEntry } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import LoadingSpinner from '../components/LoadingSpinner';
import PageContainer from '../components/PageContainer';
import { Card, EmptyState, Section, TextButton } from '../components/ui';
import { rowDivider } from '../components/uiStyles';
import { formatWeekdayDate } from '../utils/format';
import { EGG_SWATCHES, EGG_VARIETIES, eggVarietyLabel, logTotal } from '../utils/eggs';

interface DailyLogProps {
  /** Open the daily log sheet pre-filled with this entry. */
  onEdit: (log: DBLogEntry) => void;
}

/** Eggs tab: history of daily log entries. New entries are made from the "+" sheet. */
export default function DailyLog({ onEdit }: DailyLogProps) {
  const [logsSummary, setLogsSummary] = useState<DBLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { isDemo, triggerDemoToast } = useDemo();

  const observerTarget = useRef<HTMLDivElement | null>(null);
  const ITEMS_PER_PAGE = 10;

  // Single source switch for history: sample data in demo, Supabase when signed in.
  const loadLogs = async (fromIndex: number, toIndex: number): Promise<DBLogEntry[] | null> => {
    if (isDemo) return demoStore.getDailyLogs(fromIndex, toIndex);

    const { data, error } = await supabase
      .from('daily_log')
      .select('*')
      .order('date', { ascending: false })
      .range(fromIndex, toIndex);

    if (error) {
      console.error('Error loading history logs:', error.message);
      return null;
    }
    return data;
  };

  const fetchLogHistory = async (pageNumber: number, clearAndFetchFirstPage = false) => {
    if (isLoadingHistory || (!hasMore && !clearAndFetchFirstPage)) return;
    setIsLoadingHistory(true);

    const fromIndex = pageNumber * ITEMS_PER_PAGE;
    const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

    try {
      const data = await loadLogs(fromIndex, toIndex);

      if (data) {
        if (clearAndFetchFirstPage) {
          setLogsSummary(data);
          setHasMore(data.length === ITEMS_PER_PAGE);
        } else {
          setLogsSummary(prev => [...prev, ...data]);
          if (data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const refreshLogHistory = async () => {
    setPage(0);
    setHasMore(true);
    setLogsSummary([]);
    setIsLoadingHistory(true);

    try {
      const data = await loadLogs(0, ITEMS_PER_PAGE - 1);

      if (data) {
        setLogsSummary(data);
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Error refreshing log history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLogHistory(page);
  }, [page]);

  useEffect(() => {
    const currentElement = observerTarget.current;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingHistory) {
          setPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (currentElement) observer.observe(currentElement);
    return () => {
      if (currentElement) observer.unobserve(currentElement);
    };
  }, [hasMore, isLoadingHistory]);

  const handleDeleteLog = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this daily log entry?')) return;

    if (isDemo) {
      demoStore.deleteDailyLog(id);
      triggerDemoToast('Demo: daily log deleted from the sandbox');
      await refreshLogHistory();
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_log')
        .delete()
        .eq('id', id);

      if (error) throw error;

      triggerDemoToast('Daily log deleted');
      await refreshLogHistory();
    } catch (err) {
      console.error('Unexpected deletion error:', err);
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <PageContainer>
      <Section title="History">
        <Card padded={false}>
          {logsSummary.length === 0 && !isLoadingHistory ? (
            <EmptyState>No logs yet. Tap + to log today's eggs.</EmptyState>
          ) : (
            logsSummary.map((log) => {
              const varieties = EGG_VARIETIES
                .map((v) => ({ v, n: log[`eggs_${v}`] }))
                .filter(({ n }) => n > 0);

              return (
                <div key={log.id} className={`flex flex-col gap-2 px-3.5 py-3 ${rowDivider}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{formatWeekdayDate(log.date)}</span>
                    <span className="font-mono text-sm tabular-nums">
                      {logTotal(log)} <span className="font-sans text-xs text-muted">eggs</span>
                    </span>
                  </div>

                  {varieties.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      {varieties.map(({ v, n }) => (
                        <span key={v} className="flex items-center gap-1.5">
                          <span
                            className="h-[10px] w-2 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-[inset_0_0_0_1px_rgba(28,27,24,.2)]"
                            style={{ background: EGG_SWATCHES[v] }}
                          />
                          {eggVarietyLabel(v)} <span className="font-mono text-ink">{n}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {(log.boxes_for_sale > 0 || log.boxes_personal > 0) && (
                    <div className="flex gap-3 text-xs text-muted">
                      {log.boxes_for_sale > 0 && <span>For sale <span className="font-mono text-ink">{log.boxes_for_sale}</span> boxes</span>}
                      {log.boxes_personal > 0 && <span>Personal <span className="font-mono text-ink">{log.boxes_personal}</span> boxes</span>}
                    </div>
                  )}

                  {log.notes && <p className="m-0 text-xs text-ink-soft">{log.notes}</p>}

                  <div className="flex justify-end gap-4">
                    <TextButton onClick={() => onEdit(log)}>Edit</TextButton>
                    <TextButton tone="danger" onClick={() => handleDeleteLog(log.id)}>Delete</TextButton>
                  </div>
                </div>
              );
            })
          )}

          {hasMore && (
            <div ref={observerTarget} className={rowDivider}>
              <LoadingSpinner message="Loading more…" size="sm" />
            </div>
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
