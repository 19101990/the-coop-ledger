import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';

export default function PantryManager() {
  const { isDemo } = useDemo();
  
  const [boxesForSale, setBoxesForSale] = useState(0);
  const [boxesPersonal, setBoxesPersonal] = useState(0);
  const [looseEggs, setLooseEggs] = useState(0);
  
  const [editForSale, setEditForSale] = useState(0);
  const [editPersonal, setEditPersonal] = useState(0);
  const [editLoose, setEditLoose] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('pantry_inventory')
          .select('*')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setBoxesForSale(data.boxes_for_sale);
          setBoxesPersonal(data.boxes_personal);
          setLooseEggs(data.loose_eggs);
          
          setEditForSale(data.boxes_for_sale);
          setEditPersonal(data.boxes_personal);
          setEditLoose(data.loose_eggs);
        }
      } catch (error) {
        console.error('Error fetching pantry inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    fetchInventory();
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // 🛑 DEMO MODE
    if (isDemo) {
      setTimeout(() => {
        setBoxesForSale(Number(editForSale));
        setBoxesPersonal(Number(editPersonal));
        setLooseEggs(Number(editLoose));
        setIsOpen(false);
        setSaving(false);
      }, 600); // 600ms fake network delay for realism
      return;
    }

    // 🟢 LIVE MODE
    if (!isAuthenticated) {
      alert("You must be logged in to update the live inventory.");
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('pantry_inventory')
        .insert([
          {
            boxes_for_sale: Number(editForSale),
            boxes_personal: Number(editPersonal),
            loose_eggs: Number(editLoose)
          }
        ]);

      if (error) throw error;

      setBoxesForSale(Number(editForSale));
      setBoxesPersonal(Number(editPersonal));
      setLooseEggs(Number(editLoose));
      setIsOpen(false);

    } catch (error) {
      console.error('Error saving adjustment:', error);
      alert('Failed to update inventory.');
    } finally {
      setSaving(false);
    }
  };

  const potentialNewBoxes = Math.floor(looseEggs / 10);
  const remainingLoose = looseEggs % 10;

  const canEdit = isAuthenticated || isDemo;

  if (loading) {
    return <div className="p-5 text-stone-500 animate-pulse">Loading pantry inventory...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-1">📦 Pantry Manager</h2>
            <p className="text-stone-500 text-sm">Real-time inventory of what's currently on the farm shelves.</p>
          </div>
          
          {canEdit && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <span>{isOpen ? 'Close Adjustment' : 'Manual Adjust'}</span>
              <span>{isOpen ? '▴' : '▾'}</span>
            </button>
          )}
        </div>

        {isOpen && canEdit && (
          <form onSubmit={handleSaveAdjustment} className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-stone-800">Manual Inventory Correction</h3>
                <p className="text-xs text-stone-500">Update counts directly to account for breakage, personal consumption, or audits.</p>
              </div>
              {isDemo && (
                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md">
                  Demo Mode
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">For Sale Boxes</label>
                <input
                  type="number"
                  min="0"
                  value={editForSale}
                  onChange={(e) => setEditForSale(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Personal Boxes</label>
                <input
                  type="number"
                  min="0"
                  value={editPersonal}
                  onChange={(e) => setEditPersonal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Loose Eggs</label>
                <input
                  type="number"
                  min="0"
                  value={editLoose}
                  onChange={(e) => setEditLoose(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : (isDemo ? 'Test Save' : 'Save New State')}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Available for Sale</p>
              <p className="text-2xl font-bold text-emerald-900 mt-0.5">{boxesForSale} <span className="text-sm font-normal text-emerald-700">Boxes</span></p>
            </div>
            <span className="text-2xl">💰</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Personal Kitchen Stock</p>
              <p className="text-2xl font-bold text-stone-800 mt-0.5">{boxesPersonal} <span className="text-sm font-normal text-stone-500">Boxes</span></p>
            </div>
            <span className="text-2xl">🍳</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-50/60 rounded-xl border border-amber-100">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Loose Eggs Pool</p>
              <p className="text-2xl font-bold text-amber-900 mt-0.5">{looseEggs} <span className="text-sm font-normal text-amber-700">Eggs</span></p>
            </div>
            <span className="text-2xl">🥚</span>
          </div>
        </div>

        {potentialNewBoxes > 0 && (
          <div className="mt-5 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-sm flex items-start space-x-3">
            <span className="text-base mt-0.5">💡</span>
            <div>
              <p className="font-semibold">Packing Assistant</p>
              <p className="text-blue-700 mt-0.5">
                You have enough loose eggs to pack <strong>{potentialNewBoxes} additional box{potentialNewBoxes > 1 ? 'es' : ''}</strong>, leaving {remainingLoose} loose egg{remainingLoose !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}