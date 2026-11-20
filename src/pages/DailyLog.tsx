import { useState, useEffect, useRef } from 'react';
import type { DBLogEntry } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { useRefresh } from '../context/RefreshContext';
import { demoStore } from '../demo/demoStore';
import LoadingSpinner from '../components/LoadingSpinner';
import PageContainer from '../components/PageContainer';
import EggsSummary from '../components/EggsSummary';
import { Button, Card, Chevron, EmptyState, Section } from '../components/ui';
import { rowDivider } from '../components/uiStyles';
import { formatWeekdayDate } from '../utils/format';
import { EGG_SWATCHES, EGG_VARIETIES, eggVarietyLabel, logTotal } from '../utils/eggs';

const boxes = (n: number) => (n === 1 ? 'box' : 'boxes');

const ITEMS_PER_PAGE = 10;

/** History rows, newest first: sample data in demo, Supabase when signed in. Null if loading failed. */
async function loadLogs(isDemo: boolean, fromIndex: number, toIndex: number): Promise<DBLogEntry[] | null> {
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
}

interface DailyLogProps {
  /** Open the daily log sheet for a new entry (same as the bottom-bar "+"). */
  onAdd: () => void;
  /** Open the daily log sheet pre-filled with this entry. */
  onEdit: (log: DBLogEntry) => void;
}

/** Eggs tab: today's count, laying chart and the history of daily log entries. */
export default function DailyLog({ onAdd, onEdit }: DailyLogProps) {
  const [logsSummary, setLogsSummary] = useState<DBLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // Starts true: page 0 loads on mount. Set again by the scroll observer before asking for the next page.
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const { isDemo, triggerDemoToast } = useDemo();
  const { refreshKey, notifyDataChanged } = useRefresh();

  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fromIndex = page * ITEMS_PER_PAGE;
    let cancelled = false;
    loadLogs(isDemo, fromIndex, fromIndex + ITEMS_PER_PAGE - 1)
      .then((data) => {
        if (cancelled || !data) return;
        // The first page always replaces the list. Appending it could show every entry
        // twice when the initial load runs more than once (React dev mode runs effects twice).
        setLogsSummary((prev) => (page === 0 ? data : [...prev, ...data]));
        setHasMore(data.length === ITEMS_PER_PAGE);
      })
      .catch((err) => console.error('Error loading log history:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, isDemo]);

  // Quiet refresh: reload as many rows as are already shown and swap them in place, so the list
  // doesn't flash or shrink. Same row count keeps the next "load more" page lined up.
  const lastRefreshKey = useRef(refreshKey);
  useEffect(() => {
    if (lastRefreshKey.current === refreshKey) return;
    lastRefreshKey.current = refreshKey;

    const count = Math.max(logsSummary.length, ITEMS_PER_PAGE);
    let cancelled = false;
    loadLogs(isDemo, 0, count - 1)
      .then((data) => {
        if (cancelled || !data) return;
        setLogsSummary(data);
        setHasMore(data.length === count);
      })
      .catch((err) => console.error('Error refreshing log history:', err));
    return () => {
      cancelled = true;
    };
    // Runs only when a refresh is requested; reads the list length at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    const currentElement = observerTarget.current;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingHistory) {
          setIsLoadingHistory(true);
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
      notifyDataChanged();
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_log')
        .delete()
        .eq('id', id);

      if (error) throw error;

      triggerDemoToast('Daily log deleted');
      notifyDataChanged();
    } catch (err) {
      console.error('Unexpected deletion error:', err);
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <PageContainer>
      <EggsSummary onAdd={onAdd} />

      <Section title="History">
        <Card padded={false}>
          {logsSummary.length === 0 && !isLoadingHistory ? (
            <EmptyState>No logs yet. Tap + to log today's eggs.</EmptyState>
          ) : (
            logsSummary.map((log) => {
              const varieties = EGG_VARIETIES
                .map((v) => ({ v, n: log[`eggs_${v}`] }))
                .filter(({ n }) => n > 0);

              const total = logTotal(log);

              // Collapsed by default: date, eggs and boxes. Tap to see colours, notes and actions.
              return (
                <details key={log.id} className={`group ${rowDivider}`}>
                  <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 gap-y-1 px-3.5 py-3 select-none hover:bg-app [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-medium">{formatWeekdayDate(log.date)}</span>
                    <span className="font-mono text-sm tabular-nums">
                      {total} <span className="font-sans text-xs text-muted">egg{total === 1 ? '' : 's'}</span>
                    </span>
                    <Chevron className="self-center text-muted group-open:rotate-180" />
                    <span className="col-span-full text-xs text-muted">
                      For sale <span className="font-mono text-ink">{log.boxes_for_sale}</span> {boxes(log.boxes_for_sale)}
                      {' · '}
                      Personal <span className="font-mono text-ink">{log.boxes_personal}</span> {boxes(log.boxes_personal)}
                    </span>
                  </summary>

                  <div className="flex flex-col gap-4 px-3.5 pt-1 pb-3.5">
                    {varieties.length > 0 ? (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                        {varieties.map(({ v, n }) => (
                          <span key={v} className="flex items-center gap-2 text-[13px]">
                            <span
                              className="h-[13px] w-2.5 flex-none rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-[inset_0_0_0_1px_rgba(24,24,27,.2)]"
                              style={{ background: EGG_SWATCHES[v] }}
                            />
                            <span className="flex-1 text-ink-soft">{eggVarietyLabel(v)}</span>
                            <span className="font-mono tabular-nums">{n}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[13px] text-muted">No eggs counted.</span>
                    )}

                    {log.notes && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted">Notes</span>
                        <p className="m-0 text-[13px] text-ink-soft">{log.notes}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" onClick={() => onEdit(log)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteLog(log.id)}>Delete</Button>
                    </div>
                  </div>
                </details>
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
