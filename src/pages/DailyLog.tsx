import { useState, useEffect, useRef } from 'react';
import type { EggVariety, EggCounts, DBLogEntry } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import DateSelector from '../components/DateSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import CounterControl from '../components/CounterControl';
import PageContainer from '../components/PageContainer';
import { Card, EmptyState, PrimaryButton, Section, TextButton } from '../components/ui';
import { rowDivider } from '../components/uiStyles';
import { formatWeekdayDate } from '../utils/format';

// Swatch colour per egg variety (design/README.md).
const EGG_SWATCHES: Record<EggVariety, string> = {
  chocolate: '#6b4430',
  brown: '#a8714a',
  beige: '#dcc29c',
  white: '#fbf8f2',
  blue: '#bcd2cf',
  olive: '#9a9a62',
  nato: '#c9a77f',
  perlhuhn: '#e6d3bd',
};

export default function DailyLog() {
  const getTodayString = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [saleDate, setSaleDate] = useState(getTodayString());
  const [eggCollected, setEggCollected] = useState<EggCounts>({
    chocolate: 0,
    brown: 0,
    beige: 0,
    white: 0,
    blue: 0,
    olive: 0,
    nato: 0,
    perlhuhn: 0
  });
  const [boxesForSale, setBoxesForSale] = useState('');
  const [boxesForPersonal, setBoxesForPersonal] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [editingLogId, setEditingLogId] = useState<number | null>(null);

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

  const adjustEggCount = (variety: EggVariety, amount: number) => {
    setEggCollected(prev => ({
      ...prev,
      [variety]: Math.max(0, prev[variety] + amount)
    }));
  };

  const handleEggVarietyLabel = (key: string) => {
    if (key === 'perlhuhn') return 'Perlhuhn';
    if (key === 'green_olive' || key === 'olive') return 'Olive';
    if (key === 'nato') return 'Nato';
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const calculateDailyTotal = (log: DBLogEntry | EggCounts) => {
    if ('eggs_chocolate' in log) {
      return (
        (log.eggs_chocolate || 0) +
        (log.eggs_brown || 0) +
        (log.eggs_beige || 0) +
        (log.eggs_white || 0) +
        (log.eggs_olive || 0) +
        (log.eggs_blue || 0) +
        (log.eggs_nato || 0) +
        (log.eggs_perlhuhn || 0)
      );
    }
    // Sum every variety so a newly added colour can never be left out of the total.
    return Object.values(log).reduce((sum, count) => sum + (count || 0), 0);
  };

  const handleEditClick = (log: DBLogEntry) => {
    setEditingLogId(log.id);
    setSaleDate(log.date);
    setEggCollected({
      chocolate: log.eggs_chocolate,
      brown: log.eggs_brown,
      beige: log.eggs_beige,
      white: log.eggs_white,
      olive: log.eggs_olive,
      blue: log.eggs_blue,
      nato: log.eggs_nato,
      perlhuhn: log.eggs_perlhuhn
    });
    setBoxesForSale(log.boxes_for_sale ? log.boxes_for_sale.toString() : '');
    setBoxesForPersonal(log.boxes_personal ? log.boxes_personal.toString() : '');
    setLogNotes(log.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setSaleDate(getTodayString());
    setBoxesForSale('');
    setBoxesForPersonal('');
    setLogNotes('');
    setEggCollected({ chocolate: 0, brown: 0, beige: 0, white: 0, blue: 0, olive: 0, nato: 0, perlhuhn: 0 });
  };

  const handleSaveDailyLog = async () => {
    const finalDateString = saleDate;
    const packedForSale = parseInt(boxesForSale) || 0;
    const packedPersonal = parseInt(boxesForPersonal) || 0;

    // 🛑 DEMO MODE
    if (isDemo) {
      const logFields = {
        date: finalDateString,
        eggs_chocolate: eggCollected.chocolate,
        eggs_brown: eggCollected.brown,
        eggs_beige: eggCollected.beige,
        eggs_white: eggCollected.white,
        eggs_olive: eggCollected.olive,
        eggs_blue: eggCollected.blue,
        eggs_nato: eggCollected.nato,
        eggs_perlhuhn: eggCollected.perlhuhn,
        boxes_for_sale: packedForSale,
        boxes_personal: packedPersonal,
        notes: logNotes.trim() || null
      };

      if (editingLogId !== null) {
        demoStore.updateDailyLog(editingLogId, logFields);
        triggerDemoToast('Demo Mode: Daily log updated in the sandbox! 🥚');
      } else {
        demoStore.addDailyLog(logFields);

        // Mirror the live pantry bookkeeping in the sandbox.
        const pantry = demoStore.getPantry();
        const netLooseChange = calculateDailyTotal(eggCollected) - (packedForSale + packedPersonal) * 10;
        demoStore.setPantry({
          boxes_for_sale: pantry.boxes_for_sale + packedForSale,
          boxes_personal: pantry.boxes_personal + packedPersonal,
          loose_eggs: pantry.loose_eggs + netLooseChange
        });
        triggerDemoToast('Demo Mode: Daily log saved to the sandbox! 🥚');
      }

      handleCancelEdit();
      await refreshLogHistory();
      return;
    }

    // 🟢 LIVE MODE
    try {
      if (editingLogId !== null) {
        const { error: updateError } = await supabase
          .from('daily_log')
          .update({
            date: finalDateString,
            eggs_chocolate: eggCollected.chocolate,
            eggs_brown: eggCollected.brown,
            eggs_beige: eggCollected.beige,
            eggs_white: eggCollected.white,
            eggs_olive: eggCollected.olive,
            eggs_blue: eggCollected.blue,
            eggs_nato: eggCollected.nato,
            eggs_perlhuhn: eggCollected.perlhuhn,
            boxes_for_sale: packedForSale,
            boxes_personal: packedPersonal,
            notes: logNotes.trim() || null
          })
          .eq('id', editingLogId);

        if (updateError) throw updateError;
        triggerDemoToast('Live Mode: Daily log updated! 🥚');
      } else {
        const { data: pantryData, error: pantryError } = await supabase
          .from('pantry_inventory')
          .select('*')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pantryError) throw pantryError;

        let currentSaleBoxes = pantryData?.boxes_for_sale || 0;
        let currentPersonalBoxes = pantryData?.boxes_personal || 0;
        let currentLoose = pantryData?.loose_eggs || 0;

        const totalCollected = calculateDailyTotal(eggCollected);
        const eggsUsedForPacking = (packedForSale * 10) + (packedPersonal * 10);
        const netLooseChange = totalCollected - eggsUsedForPacking;

        const newLoose = currentLoose + netLooseChange;
        const newSaleBoxes = currentSaleBoxes + packedForSale;
        const newPersonalBoxes = currentPersonalBoxes + packedPersonal;

        const { error: logError } = await supabase
          .from('daily_log')
          .insert([
            {
              date: finalDateString,
              eggs_chocolate: eggCollected.chocolate,
              eggs_brown: eggCollected.brown,
              eggs_beige: eggCollected.beige,
              eggs_white: eggCollected.white,
              eggs_olive: eggCollected.olive,
              eggs_blue: eggCollected.blue,
              eggs_nato: eggCollected.nato,
              eggs_perlhuhn: eggCollected.perlhuhn,
              boxes_for_sale: packedForSale,
              boxes_personal: packedPersonal,
              notes: logNotes.trim() || null
            }
          ]);

        if (logError) throw logError;

        const { error: updatePantryError } = await supabase
          .from('pantry_inventory')
          .insert([
            {
              boxes_for_sale: newSaleBoxes,
              boxes_personal: newPersonalBoxes,
              loose_eggs: newLoose
            }
          ]);

        if (updatePantryError) throw updatePantryError;
        triggerDemoToast('Live Mode: Daily log and Pantry saved! 🥚');
      }

      handleCancelEdit();
      await refreshLogHistory();
    } catch (err: any) {
      console.error('Unexpected tracking error:', err);
      alert(`Transaction Failed: ${err.message}`);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this daily log entry?')) return;

    if (isDemo) {
      demoStore.deleteDailyLog(id);
      triggerDemoToast('Demo Mode: Daily log deleted from the sandbox! 🗑️');
      await refreshLogHistory();
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_log')
        .delete()
        .eq('id', id);

      if (error) throw error;

      triggerDemoToast('Live Mode: Daily log deleted! 🗑️');
      await refreshLogHistory();
    } catch (err: any) {
      console.error('Unexpected deletion error:', err);
      alert(`Deletion Failed: ${err.message}`);
    }
  };

  return (
    <PageContainer>
      <Section
        title={editingLogId ? 'Edit entry' : 'New entry'}
        action={editingLogId ? { label: 'Cancel edit', onClick: handleCancelEdit } : undefined}
      >
        <div className="flex flex-col gap-4">
          <DateSelector value={saleDate} onChange={setSaleDate} label="Date collected" />

          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <span className="text-[13px] text-muted">Total collected</span>
            <span className="font-mono text-[40px] font-medium tracking-[-.03em] tabular-nums">
              {calculateDailyTotal(eggCollected)}
            </span>
          </div>

          <Card padded={false}>
            {Object.entries(eggCollected).map(([variety, count]) => (
              <CounterControl
                key={variety}
                label={handleEggVarietyLabel(variety)}
                swatch={EGG_SWATCHES[variety as EggVariety]}
                value={count}
                onDecrement={() => adjustEggCount(variety as EggVariety, -1)}
                onIncrement={() => adjustEggCount(variety as EggVariety, 1)}
              />
            ))}
          </Card>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">Packed into boxes of 10</span>
            <Card padded={false}>
              {[
                { label: 'Boxes for sale', value: boxesForSale, set: setBoxesForSale },
                { label: 'Boxes for personal use', value: boxesForPersonal, set: setBoxesForPersonal },
              ].map(({ label, value, set }) => {
                const n = parseInt(value) || 0;
                return (
                  <CounterControl
                    key={label}
                    label={label}
                    value={n}
                    onDecrement={() => set(String(Math.max(0, n - 1)))}
                    onIncrement={() => set(String(n + 1))}
                  />
                );
              })}
            </Card>
          </div>

          <input
            type="text"
            aria-label="Notes"
            placeholder="Notes — weather, hens, coop work"
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            className="h-11 w-full rounded-lg border border-edge bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink"
          />

          <PrimaryButton onClick={handleSaveDailyLog}>
            {editingLogId ? 'Update daily log' : 'Save daily log'}
          </PrimaryButton>
        </div>
      </Section>

      <Section title="History">
        <Card padded={false}>
          {logsSummary.length === 0 ? (
            <EmptyState>No logs yet. Create your first entry above.</EmptyState>
          ) : (
            logsSummary.map((log) => {
              const varieties = (Object.keys(EGG_SWATCHES) as EggVariety[])
                .map((v) => ({ v, n: log[`eggs_${v}` as keyof DBLogEntry] as number }))
                .filter(({ n }) => n > 0);

              return (
                <div key={log.id} className={`flex flex-col gap-2 px-3.5 py-3 ${rowDivider}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{formatWeekdayDate(log.date)}</span>
                    <span className="font-mono text-sm tabular-nums">
                      {calculateDailyTotal(log)} <span className="font-sans text-xs text-muted">eggs</span>
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
                          {handleEggVarietyLabel(v)} <span className="font-mono text-ink">{n}</span>
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
                    <TextButton onClick={() => handleEditClick(log)}>Edit</TextButton>
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
