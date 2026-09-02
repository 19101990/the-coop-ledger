import { useState, useEffect, useRef } from 'react';
import type { EggVariety, EggCounts, DBLogEntry } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';

export default function DailyLog() {
  const [logDate, setLogDate] = useState('today');
  const [customDate, setCustomDate] = useState('');
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

    if (currentElement) {
      observer.observe(currentElement);
    }

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

  const handleSaveDailyLog = async () => {
    let finalDateString = '';
    const todayObj = new Date();

    if (logDate === 'today') {
      finalDateString = todayObj.toISOString().split('T')[0];
    } else if (logDate === 'yesterday') {
      const yesterdayObj = new Date();
      yesterdayObj.setDate(todayObj.getDate() - 1);
      finalDateString = yesterdayObj.toISOString().split('T')[0];
    } else {
      if (!customDate) {
        alert('Please choose a previous date first.');
        return;
      }
      finalDateString = customDate;
    }

    // 🛑 DEMO MODE
    if (isDemo) {
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
        boxes_for_sale: parseInt(boxesForSale) || 0,
        boxes_personal: parseInt(boxesForPersonal) || 0,
        notes: logNotes.trim() || null
      };

      const updatedLogs = [newEntry, ...logsSummary];
      setLogsSummary(updatedLogs);
      localStorage.setItem('demo_daily_logs', JSON.stringify(updatedLogs));

      triggerDemoToast('Demo Mode: Daily log saved locally! 🥚');

      setLogDate('today');
      setCustomDate('');
      setBoxesForSale('');
      setBoxesForPersonal('');
      setLogNotes('');
      setEggCollected({ chocolate: 0, brown: 0, beige: 0, blue: 0, olive: 0, nato: 0, perlhuhn: 0 });
      return; 
    }

    // 🟢 LIVE MODE
    try {
      // Fetch current pantry state
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

      // Calculate net change in loose eggs and add new boxes
      const totalCollected = calculateDailyTotal(eggCollected);
      const packedForSale = parseInt(boxesForSale) || 0;
      const packedPersonal = parseInt(boxesForPersonal) || 0;
      
      const eggsUsedForPacking = (packedForSale * 10) + (packedPersonal * 10);
      const netLooseChange = totalCollected - eggsUsedForPacking;

      const newLoose = currentLoose + netLooseChange;
      const newSaleBoxes = currentSaleBoxes + packedForSale;
      const newPersonalBoxes = currentPersonalBoxes + packedPersonal;

      // Save the Daily Log
      const { data: logData, error: logError } = await supabase
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
        ])
        .select();

      if (logError) throw logError;

      // Save the new Pantry State
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

      if (logData) {
        triggerDemoToast('Live Mode: Daily log and Pantry saved! 🥚');
        
        setLogDate('today');
        setCustomDate('');
        setBoxesForSale('');
        setBoxesForPersonal('');
        setLogNotes('');
        setEggCollected({ chocolate: 0, brown: 0, beige: 0, blue: 0, olive: 0, nato: 0, perlhuhn: 0 });

        setPage(0);
        setHasMore(true);
        fetchLogHistory(0, true);
      }
    } catch (err: any) {
      console.error('Unexpected tracking error:', err);
      alert(`Transaction Failed: ${err.message}`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 animate-fade-in">
      <div className="flex flex-col gap-6">

        {/* Input Form Card */}
        <div className="w-full bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-4">🐔 Daily Coop Log</h2>
          
          <div className="mb-5">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Date Collected
            </label>
            <select 
              value={logDate} 
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500 mb-2"
            >
              <option value="today">Today (Current Day)</option>
              <option value="yesterday">Yesterday</option>
              <option value="custom">Choose previous date...</option>
            </select>

            {logDate === 'custom' && (
              <input 
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500 animate-fade-in"
              />
            )}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Egg Collection Counters
            </label>
            <div className="space-y-2 pr-1">
              {(Object.keys(eggCollected) as EggVariety[]).map((variety) => (
                <div key={variety} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-150">
                  <span className="font-medium text-stone-700">{handleEggVarietyLabel(variety)}</span>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => adjustEggCount(variety, -1)}
                      className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-lg text-stone-900">{eggCollected[variety]}</span>
                    <button 
                      onClick={() => adjustEggCount(variety, 1)}
                      className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Boxes Packed for Sale (10-packs)
              </label>
              <input 
                type="number" 
                placeholder="0"
                value={boxesForSale}
                onChange={(e) => setBoxesForSale(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Boxes for Own Use (10-packs)
              </label>
              <input 
                type="number" 
                placeholder="0"
                value={boxesForPersonal}
                onChange={(e) => setBoxesForPersonal(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Coop Notes
            </label>
            <textarea 
              rows={2}
              placeholder="Any notable chicken events, issues, or details..."
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <button 
            onClick={handleSaveDailyLog}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-xs"
          >
            Save Entry
          </button>
        </div>

        {/* Historical production Log Feed Card */}
        <div className="w-full bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-4">📊 Historical Production Feed</h2>

          <div className="space-y-4">
            {logsSummary.map((log, index) => {
              const dayTotal = calculateDailyTotal(log);

              return (
                <div key={`coop-log-${log.id || log.date}-${index}`} className="p-4 bg-stone-50 rounded-xl border border-stone-150">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2 mb-3">
                    <span className="font-bold text-stone-800">
                      {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-xs px-2.5 py-1 rounded-full">
                      Total: {dayTotal} Eggs
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium text-stone-600">
                    {log.eggs_chocolate > 0 && <div>Chocolate: <span className="font-bold text-stone-900">{log.eggs_chocolate}</span></div>}
                    {log.eggs_brown > 0 && <div>Brown: <span className="font-bold text-stone-900">{log.eggs_brown}</span></div>}
                    {log.eggs_beige > 0 && <div>Beige: <span className="font-bold text-stone-900">{log.eggs_beige}</span></div>}
                    {log.eggs_olive > 0 && <div>Olive: <span className="font-bold text-stone-900">{log.eggs_olive}</span></div>}
                    {log.eggs_blue > 0 && <div>Blue: <span className="font-bold text-stone-900">{log.eggs_blue}</span></div>}
                    {log.eggs_nato > 0 && <div>Nato: <span className="font-bold text-stone-900">{log.eggs_nato}</span></div>}
                    {log.eggs_perlhuhn > 0 && <div>Perlhuhn: <span className="font-bold text-stone-900">{log.eggs_perlhuhn}</span></div>}
                  </div>

                  {(log.boxes_for_sale > 0 || log.boxes_personal > 0) && (
                    <div className="mt-3 pt-2 border-t border-dashed border-stone-200 flex space-x-4 text-xs text-stone-500">
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
              );
            })}
          </div>

          <div ref={observerTarget} className="h-12 flex items-center justify-center mt-4 border-t border-stone-100 pt-4">
            {isLoadingHistory && <span className="text-xs text-stone-400 animate-pulse">Loading older coop entries...</span>}
            {!hasMore && logsSummary.length > 0 && (
              <span className="text-xs text-stone-400 font-semibold">End daily log entries</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}