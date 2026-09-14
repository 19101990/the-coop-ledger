import { useState, useEffect, useRef } from 'react';
import type { EggVariety, EggCounts, DBLogEntry } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import DateSelector from '../components/DateSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SectionHeader from '../components/SectionHeader';

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

  const fetchLogHistory = async (pageNumber: number, clearAndFetchFirstPage = false) => {
    if (isLoadingHistory || (!hasMore && !clearAndFetchFirstPage)) return;
    setIsLoadingHistory(true);

    const fromIndex = pageNumber * ITEMS_PER_PAGE;
    const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

    try {
      const { data, error } = await supabase
        .from('daily_log')
        .select('*')
        .order('date', { ascending: false })
        .range(fromIndex, toIndex);

      if (error) {
        console.error('Error loading history logs:', error.message);
        return;
      }

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
      const { data, error } = await supabase
        .from('daily_log')
        .select('*')
        .order('date', { ascending: false })
        .limit(ITEMS_PER_PAGE);

      if (error) {
        console.error('Error refreshing logs:', error.message);
        return;
      }

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
        (log.eggs_olive || 0) +
        (log.eggs_blue || 0) +
        (log.eggs_nato || 0) +
        (log.eggs_perlhuhn || 0)
      );
    }
    return (
      (log.chocolate || 0) +
      (log.brown || 0) +
      (log.beige || 0) +
      (log.olive || 0) +
      (log.blue || 0) +
      (log.nato || 0) +
      (log.perlhuhn || 0)
    );
  };

  const handleEditClick = (log: DBLogEntry) => {
    setEditingLogId(log.id);
    setSaleDate(log.date);
    setEggCollected({
      chocolate: log.eggs_chocolate,
      brown: log.eggs_brown,
      beige: log.eggs_beige,
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
    setEggCollected({ chocolate: 0, brown: 0, beige: 0, blue: 0, olive: 0, nato: 0, perlhuhn: 0 });
  };

  const handleSaveDailyLog = async () => {
    const finalDateString = saleDate;
    const packedForSale = parseInt(boxesForSale) || 0;
    const packedPersonal = parseInt(boxesForPersonal) || 0;

    // 🛑 DEMO MODE
    if (isDemo) {
      let updatedLogs: DBLogEntry[];
      if (editingLogId !== null) {
        updatedLogs = logsSummary.map(log => 
          log.id === editingLogId 
            ? {
                ...log,
                date: finalDateString,
                eggs_chocolate: eggCollected.chocolate,
                eggs_brown: eggCollected.brown,
                eggs_beige: eggCollected.beige,
                eggs_olive: eggCollected.olive,
                eggs_blue: eggCollected.blue,
                eggs_nato: eggCollected.nato,
                eggs_perlhuhn: eggCollected.perlhuhn,
                boxes_for_sale: packedForSale,
                boxes_personal: packedPersonal,
                notes: logNotes.trim() || null
              }
            : log
        );
        triggerDemoToast('Demo Mode: Daily log updated locally! 🥚');
      } else {
        const newEntry: DBLogEntry = {
          id: Date.now(),
          created_at: new Date().toISOString(),
          date: finalDateString,
          eggs_chocolate: eggCollected.chocolate,
          eggs_brown: eggCollected.brown,
          eggs_beige: eggCollected.beige,
          eggs_olive: eggCollected.olive,
          eggs_blue: eggCollected.blue,
          eggs_nato: eggCollected.nato,
          eggs_perlhuhn: eggCollected.perlhuhn,
          boxes_for_sale: packedForSale,
          boxes_personal: packedPersonal,
          notes: logNotes.trim() || null
        };
        updatedLogs = [newEntry, ...logsSummary];
        triggerDemoToast('Demo Mode: Daily log saved locally! 🥚');
      }

      setLogsSummary(updatedLogs);
      localStorage.setItem('demo_daily_logs', JSON.stringify(updatedLogs));
      handleCancelEdit();
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
      const updatedLogs = logsSummary.filter(log => log.id !== id);
      setLogsSummary(updatedLogs);
      localStorage.setItem('demo_daily_logs', JSON.stringify(updatedLogs));
      triggerDemoToast('Demo Mode: Daily log deleted locally! 🗑️');
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
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 animate-fade-in">
      <div className="flex flex-col gap-6">
        <div className="w-full bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <SectionHeader emoji="🐔" title={editingLogId ? "Edit Daily Log" : "Daily Coop Log"} />
            {editingLogId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <DateSelector
            value={saleDate}
            onChange={setSaleDate}
            label="Date Collected"
          />

          <div className="mb-6">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Egg Collection Counters
            </label>

            <div className="grid grid-cols-1 gap-3">
              {Object.entries(eggCollected).map(([variety, count]) => (
                <div key={variety} className="flex items-center space-x-2 bg-stone-50 p-3 rounded-xl border border-stone-150">
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900 text-sm">{handleEggVarietyLabel(variety)}</p>
                    <p className="text-xs text-stone-400">Collected</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => adjustEggCount(variety as EggVariety, -1)}
                      className="w-6 h-6 text-xs font-bold text-stone-600 bg-white hover:bg-stone-100 border border-stone-200 rounded cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{count}</span>
                    <button
                      onClick={() => adjustEggCount(variety as EggVariety, 1)}
                      className="w-6 h-6 text-xs font-bold text-stone-600 bg-white hover:bg-stone-100 border border-stone-200 rounded cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-right text-stone-500 mt-2">Total: {calculateDailyTotal(eggCollected)} eggs</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Boxes for Sale
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={boxesForSale}
                onChange={(e) => setBoxesForSale(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Boxes for Personal Use
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={boxesForPersonal}
                onChange={(e) => setBoxesForPersonal(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Log Notes
            </label>
            <textarea
              rows={3}
              placeholder="Any observations about the hens, weather, or other notes..."
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <button
            onClick={handleSaveDailyLog}
            className={`w-full font-bold py-3 px-4 rounded-xl transition-colors shadow-xs text-white cursor-pointer ${editingLogId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {editingLogId ? 'Update Daily Log Entry' : 'Save Daily Log'}
          </button>
        </div>

        <div className="w-full bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <h3 className="text-lg font-bold text-stone-900 mb-4">📋 Historical Logs</h3>

          {logsSummary.length === 0 ? (
            <LoadingSpinner message="No logs yet. Create your first entry above!" size="sm" />
          ) : (
            <div className="space-y-3">
              {logsSummary.map((log) => (
                <div key={log.id} className="p-4 bg-stone-50 rounded-xl border border-stone-150">
                    <div className="flex text-xs font-medium text-stone-600 mb-3 justify-between items-start">
                        <div className="flex flex-col justify-between items-start pb-2">
                            <span className="font-bold text-stone-800">
                                {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-amber-900 font-bold text-xs">
                                Total: {calculateDailyTotal(log)} Eggs
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleEditClick(log)}
                                className="text-xs px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded-md transition-colors cursor-pointer"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-md transition-colors cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium text-stone-600 mb-3">
                    {log.eggs_chocolate > 0 && <div>Chocolate: <span className="font-bold text-stone-900">{log.eggs_chocolate}</span></div>}
                    {log.eggs_brown > 0 && <div>Brown: <span className="font-bold text-stone-900">{log.eggs_brown}</span></div>}
                    {log.eggs_beige > 0 && <div>Beige: <span className="font-bold text-stone-900">{log.eggs_beige}</span></div>}
                    {log.eggs_olive > 0 && <div>Olive: <span className="font-bold text-stone-900">{log.eggs_olive}</span></div>}
                    {log.eggs_blue > 0 && <div>Blue: <span className="font-bold text-stone-900">{log.eggs_blue}</span></div>}
                    {log.eggs_nato > 0 && <div>Nato: <span className="font-bold text-stone-900">{log.eggs_nato}</span></div>}
                    {log.eggs_perlhuhn > 0 && <div>Perlhuhn: <span className="font-bold text-stone-900">{log.eggs_perlhuhn}</span></div>}
                  </div>

                  {(log.boxes_for_sale > 0 || log.boxes_personal > 0) && (
                    <div className="pt-2 border-t border-dashed border-stone-200 flex space-x-4 text-xs text-stone-500">
                      {log.boxes_for_sale > 0 && <span>For Sale: <strong className="text-stone-700">{log.boxes_for_sale} boxes</strong></span>}
                      {log.boxes_personal > 0 && <span>Personal: <strong className="text-stone-700">{log.boxes_personal} boxes</strong></span>}
                    </div>
                  )}

                  {log.notes && (
                    <p className="text-xs text-stone-500 italic mt-2 bg-stone-100 p-2 rounded-lg">
                      📝 {log.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div ref={observerTarget} className="mt-4 py-2 text-center">
              <LoadingSpinner message="Loading more..." size="sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}