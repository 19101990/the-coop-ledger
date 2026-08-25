import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';

export default function FlockManager() {
  const { isDemo, triggerDemoToast } = useDemo();

  const [chickenHens, setChickenHens] = useState<number>(0);
  const [chickenRoosters, setChickenRoosters] = useState<number>(0);
  const [perlhuhnHens, setPerlhuhnHens] = useState<number>(0);
  const [perlhuhnRoosters, setPerlhuhnRoosters] = useState<number>(0);
  const [flockNotes, setFlockNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestCensus = async () => {
      try {
        const { data, error } = await supabase
          .from('flock_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          setChickenHens(data.chicken_hens || 0);
          setChickenRoosters(data.chicken_roosters || 0);
          setPerlhuhnHens(data.perlhuhn_hens || 0);
          setPerlhuhnRoosters(data.perlhuhn_roosters || 0);
        }
      } catch (err) {
        console.error('Error loading past census:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestCensus();
  }, []);

  const adjustCount = (setter: React.Dispatch<React.SetStateAction<number>>, amount: number) => {
    setter(prev => Math.max(0, prev + amount));
  };

  const handleSaveFlock = async () => {
    // 🛑 DEMO MODE
    if (isDemo) {
      triggerDemoToast('Demo Mode: Flock census saved locally! 🐓');
      setFlockNotes('');
      return;
    }

    // 🟢 LIVE MODE
    try {
      const { error } = await supabase
        .from('flock_logs')
        .insert([{
          chicken_hens: chickenHens,
          chicken_roosters: chickenRoosters,
          perlhuhn_hens: perlhuhnHens,
          perlhuhn_roosters: perlhuhnRoosters,
          notes: flockNotes.trim() || null
        }]);

      if (error) {
        console.error('Error saving flock data:', error.message);
        alert(`Failed to save census to database: ${error.message}`);
        return;
      }

      triggerDemoToast('Live Mode: Flock census saved to cloud! 🐓');
      setFlockNotes('');
    } catch (err) {
      console.error('Unexpected error saving census:', err);
    }
  };

  const totalBirds = chickenHens + chickenRoosters + perlhuhnHens + perlhuhnRoosters;

  if (isLoading) {
    return <div className="p-6 text-center text-stone-500 text-sm">Loading current census...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="bg-stone-800 text-white p-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300 mb-1">Total Poultry</h2>
          <p className="text-3xl font-bold">{totalBirds} <span className="text-base font-normal text-stone-400">Birds</span></p>
        </div>
        <span className="text-4xl opacity-80">🐓</span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h3 className="text-lg font-bold text-stone-900 mb-4">📝 Live Census</h3>

        <div className="space-y-3 mb-6">
          
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-150">
            <div>
              <p className="font-semibold text-stone-800">Chicken Hens</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">Standard Layers</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => adjustCount(setChickenHens, -1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-lg text-stone-900">{chickenHens}</span>
              <button 
                onClick={() => adjustCount(setChickenHens, 1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-150">
            <div>
              <p className="font-semibold text-stone-800">Chicken Roosters</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">Flock Companions</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => adjustCount(setChickenRoosters, -1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-lg text-stone-900">{chickenRoosters}</span>
              <button 
                onClick={() => adjustCount(setChickenRoosters, 1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-150">
            <div>
              <p className="font-semibold text-stone-800">Perlhuhn Hens</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">Guinea Fowl Layers</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => adjustCount(setPerlhuhnHens, -1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-lg text-stone-900">{perlhuhnHens}</span>
              <button 
                onClick={() => adjustCount(setPerlhuhnHens, 1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-150">
            <div>
              <p className="font-semibold text-stone-800">Perlhuhn Roosters</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">Guinea Fowl Companions</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => adjustCount(setPerlhuhnRoosters, -1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-lg text-stone-900">{perlhuhnRoosters}</span>
              <button 
                onClick={() => adjustCount(setPerlhuhnRoosters, 1)}
                className="w-10 h-10 bg-white active:bg-stone-100 text-stone-600 font-bold text-xl rounded-lg border border-stone-200 flex items-center justify-center shadow-xs select-none"
              >
                +
              </button>
            </div>
          </div>

        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
            Flock Health & Notes
          </label>
          <textarea 
            rows={3}
            placeholder="Log broody hens, mortalities, or new additions..."
            value={flockNotes}
            onChange={(e) => setFlockNotes(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        <button 
          onClick={handleSaveFlock}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-xs"
        >
          Save Flock Census
        </button>

      </div>
    </div>
  );
}