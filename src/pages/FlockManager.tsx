import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import DateSelector from '../components/DateSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SectionHeader from '../components/SectionHeader';
import type { FlockMember } from '../types/types';

export default function FlockManager() {
  const getTodayString = (): string => new Date().toISOString().split('T')[0];
  const { isDemo, triggerDemoToast } = useDemo();

  // Data State
  const [breeds, setBreeds] = useState<string[]>([]);
  const [flock, setFlock] = useState<FlockMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [breed, setBreed] = useState('');
  const [showAddBreed, setShowAddBreed] = useState(false);
  const [newBreedInput, setNewBreedInput] = useState('');
  
  const [hatchDate, setHatchDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [sex, setSex] = useState<'Hen' | 'Rooster'>('Hen');
  const [color, setColor] = useState('');
  const [bandNumber, setBandNumber] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  // Archiving State
  const [archivingId, setArchivingId] = useState<number | string | null>(null);
  const [archiveDate, setArchiveDate] = useState(getTodayString());
  const [archiveReason, setArchiveReason] = useState('');

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const [breedsRes, flockRes] = await Promise.all([
          supabase.from('breeds').select('name').order('name'),
          supabase.from('flock_members').select('*').order('created_at', { ascending: false })
        ]);

        if (breedsRes.data) setBreeds(breedsRes.data.map(b => b.name));
        if (flockRes.data) setFlock(flockRes.data);
      } catch (err) {
        console.error('Failed to load flock data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Actions
  const handleAddBreed = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBreedInput.trim();
    if (!cleanName) return;
    if (breeds.includes(cleanName)) {
      alert('This breed already exists!');
      return;
    }

    if (isDemo) {
      const updatedBreeds = [...breeds, cleanName].sort();
      setBreeds(updatedBreeds);
      setBreed(cleanName);
      setNewBreedInput('');
      setShowAddBreed(false);
      triggerDemoToast(`Demo Mode: Breed "${cleanName}" added locally!`);
      return;
    }

    try {
      const { error } = await supabase.from('breeds').insert([{ name: cleanName }]);
      if (error) throw error;
      setBreeds(prev => [...prev, cleanName].sort());
      setBreed(cleanName);
      setNewBreedInput('');
      setShowAddBreed(false);
    } catch (err: any) {
      alert(`Error adding breed: ${err.message}`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setBreed('');
    setHatchDate('');
    setBirthYear('');
    setSex('Hen');
    setColor('');
    setBandNumber('');
    setName('');
    setNotes('');
  };

  const handleEditClick = (bird: FlockMember) => {
    setEditingId(bird.id);
    setBreed(bird.breed);
    setHatchDate(bird.hatch_date || '');
    setBirthYear(bird.birth_year ? bird.birth_year.toString() : '');
    setSex(bird.sex);
    setColor(bird.color || '');
    setBandNumber(bird.band_number || '');
    setName(bird.name || '');
    setNotes(bird.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveBird = async () => {
    if (!breed) {
      alert("Please select a breed.");
      return;
    }

    const payload = {
      breed,
      hatch_date: hatchDate || null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      sex,
      color: color.trim() || null,
      band_number: bandNumber.trim() || null,
      name: name.trim() || null,
      notes: notes.trim() || null,
      status: 'Active' as const
    };

    if (isDemo) {
      let updatedFlock = [...flock];
      if (editingId) {
        updatedFlock = updatedFlock.map(b => b.id === editingId ? { ...b, ...payload } : b);
        triggerDemoToast('Demo Mode: Bird updated locally! 🐓');
      } else {
        const newBird: FlockMember = { id: Date.now(), ...payload, archive_date: null, archive_reason: null };
        updatedFlock = [newBird, ...updatedFlock];
        triggerDemoToast('Demo Mode: Bird added locally! 🐓');
      }
      setFlock(updatedFlock);
      resetForm();
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('flock_members').update(payload).eq('id', editingId);
        if (error) throw error;
        triggerDemoToast('Live Mode: Bird updated! 🐓');
      } else {
        const { error } = await supabase.from('flock_members').insert([payload]);
        if (error) throw error;
        triggerDemoToast('Live Mode: Bird added! 🐓');
      }
      
      const { data } = await supabase.from('flock_members').select('*').order('created_at', { ascending: false });
      if (data) setFlock(data);
      resetForm();
    } catch (err: any) {
      alert(`Save Failed: ${err.message}`);
    }
  };

  const handleArchiveBird = async () => {
    if (!archiveReason) {
      alert("Please provide a reason for archiving.");
      return;
    }

    const payload = {
      status: 'Archived' as const,
      archive_date: archiveDate,
      archive_reason: archiveReason.trim()
    };

    if (isDemo) {
      const updatedFlock = flock.map(b => 
        b.id === archivingId ? { ...b, ...payload } : b
      );
      setFlock(updatedFlock);
      triggerDemoToast('Demo Mode: Bird archived locally! 🗄️');
      setArchivingId(null);
      setArchiveReason('');
      return;
    }

    try {
      const { error } = await supabase.from('flock_members').update(payload).eq('id', archivingId);
      if (error) throw error;
      triggerDemoToast('Live Mode: Bird archived. 🗄️');
      const { data } = await supabase.from('flock_members').select('*').order('created_at', { ascending: false });
      if (data) setFlock(data);
      setArchivingId(null);
      setArchiveReason('');
    } catch (err: any) {
      alert(`Archive Failed: ${err.message}`);
    }
  };

  const activeBirds = flock.filter(b => b.status === 'Active');
  const archivedBirds = flock.filter(b => b.status === 'Archived');
  
  const totalHens = activeBirds.filter(b => b.sex === 'Hen').length;
  const totalRoosters = activeBirds.filter(b => b.sex === 'Rooster').length;

  const breedCounts = activeBirds.reduce((acc, bird) => {
    if (!acc[bird.breed]) acc[bird.breed] = { Hen: 0, Rooster: 0 };
    acc[bird.breed][bird.sex]++;
    return acc;
  }, {} as Record<string, { Hen: number; Rooster: number }>);

  if (isLoading) return <LoadingSpinner message="Loading flock data..." size="md" />;

  return (
    <div className="w-full max-w-lg mx-auto p-4 animate-fade-in space-y-6">
      
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <SectionHeader emoji="🐓" title="Flock Census" />
        
        <div className="flex justify-between items-center bg-stone-800 text-white p-4 rounded-xl shadow-xs mt-4 mb-4">
          <div>
            <p className="text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">Total Active Birds</p>
            <p className="text-3xl font-black">{activeBirds.length}</p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-0.5">Hens</p>
              <p className="text-xl font-bold">{totalHens}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-0.5">Roosters</p>
              <p className="text-xl font-bold">{totalRoosters}</p>
            </div>
          </div>
        </div>

        {Object.keys(breedCounts).length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(breedCounts).map(([breedName, counts]) => (
              <div key={breedName} className="bg-stone-50 border border-stone-150 p-2 rounded-lg flex justify-between items-center">
                <span className="text-xs font-bold text-stone-700 truncate mr-2">{breedName}</span>
                <div className="text-[10px] font-semibold text-stone-500 shrink-0">
                  {counts.Hen} H / {counts.Rooster} R
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-900">{editingId ? '✏️ Edit Bird' : '🐣 Add New Bird'}</h3>
          {editingId && (
            <button onClick={resetForm} className="text-[10px] px-3 py-1.5 bg-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-300 transition-colors cursor-pointer">
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">Breed / Type</label>
              <button type="button" onClick={() => setShowAddBreed(!showAddBreed)} className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer">
                {showAddBreed ? 'Cancel' : '+ New Breed'}
              </button>
            </div>
            {!showAddBreed ? (
              <select value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                <option value="" disabled>Select Breed</option>
                {breeds.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <form onSubmit={handleAddBreed} className="flex gap-2">
                <input type="text" placeholder="Breed name" value={newBreedInput} onChange={(e) => setNewBreedInput(e.target.value)} className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                <button type="submit" className="bg-stone-800 text-white text-xs px-3 rounded-xl font-bold cursor-pointer">Save</button>
              </form>
            )}
          </div>

          <div className="col-span-2 flex bg-stone-100 p-1 rounded-xl">
            {(['Hen', 'Rooster'] as const).map(s => (
              <button key={s} type="button" onClick={() => setSex(s)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${sex === s ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Band / Ring ID</label>
            <input type="text" placeholder="e.g. 124" value={bandNumber} onChange={(e) => setBandNumber(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Pet Name</label>
            <input type="text" placeholder="Optional" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Birth Year</label>
            <input type="number" placeholder="YYYY" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Color Details</label>
            <input type="text" placeholder="e.g. White spotted" value={color} onChange={(e) => setColor(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>

          <div className="col-span-2">
            <DateSelector value={hatchDate} onChange={setHatchDate} label="Exact Hatch / Purchase Date (Optional)" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea rows={2} placeholder="Any medical or background notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <button onClick={handleSaveBird} className={`w-full font-bold py-3 px-4 rounded-xl transition-colors shadow-xs text-white mt-2 cursor-pointer ${editingId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
          {editingId ? 'Update Bird Details' : 'Save to Flock'}
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h3 className="text-sm font-bold text-stone-900 mb-4">📋 Active Members</h3>
        {activeBirds.length === 0 ? (
          <p className="text-xs text-stone-500 italic text-center py-4">No birds logged yet.</p>
        ) : (
          <div className="space-y-2">
            {activeBirds.map(bird => (
              <details key={bird.id} className="group bg-stone-50 rounded-xl border border-stone-150 overflow-hidden">
                <summary className="p-3 flex justify-between items-center cursor-pointer select-none outline-none marker:content-none hover:bg-stone-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{bird.sex === 'Hen' ? '🐔' : '🐓'}</span>
                    <div>
                      <p className="text-sm font-bold text-stone-800">
                        {bird.name ? `${bird.name} ` : ''}
                        <span className="text-xs font-semibold text-stone-500">
                          ({bird.breed})
                        </span>
                      </p>
                      <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mt-0.5">
                        {bird.birth_year || 'Unknown Year'} {bird.band_number ? `• Band: ${bird.band_number}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="p-3 pt-0 border-t border-stone-100 bg-white">
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 my-3">
                    {bird.color && <div><strong className="text-stone-800">Color:</strong> {bird.color}</div>}
                    {bird.hatch_date && <div><strong className="text-stone-800">Hatched:</strong> {bird.hatch_date}</div>}
                  </div>
                  {bird.notes && (
                    <div className="text-xs bg-stone-50 p-2 rounded text-stone-600 italic mb-3">"{bird.notes}"</div>
                  )}
                  
                  {archivingId === bird.id ? (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-lg mt-2">
                      <p className="text-[10px] font-bold text-red-700 uppercase mb-2">Archive Bird</p>
                      <DateSelector value={archiveDate} onChange={setArchiveDate} label="Archive Date" />
                      <input type="text" placeholder="Reason (e.g. Sold, Passed away)" value={archiveReason} onChange={e => setArchiveReason(e.target.value)} className="w-full bg-white border border-red-200 rounded mt-2 p-2 text-xs focus:outline-none" />
                      <div className="flex gap-2 mt-3">
                        <button onClick={handleArchiveBird} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 rounded cursor-pointer transition-colors">Confirm Archive</button>
                        <button onClick={() => setArchivingId(null)} className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold py-1.5 rounded cursor-pointer transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end mt-2">
                      <button onClick={() => handleEditClick(bird)} className="px-3 py-1 bg-stone-200 text-stone-700 text-[10px] font-bold rounded hover:bg-stone-300 transition-colors cursor-pointer">Edit</button>
                      <button onClick={() => setArchivingId(bird.id)} className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded hover:bg-red-200 transition-colors cursor-pointer">Archive</button>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      { archivedBirds.length > 0 && (
        <details className="group bg-stone-100/50 rounded-2xl border border-stone-200">
          <summary className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider cursor-pointer outline-none marker:content-none text-center hover:bg-stone-100 transition-colors rounded-2xl">
            View Archived Birds ({archivedBirds.length}) ▼
          </summary>
          <div className="p-4 pt-0 space-y-2">
            {archivedBirds.map(bird => (
              <div key={bird.id} className="p-3 bg-white border border-stone-200 rounded-xl opacity-75">
                <p className="text-sm font-bold text-stone-800">
                  {bird.name || bird.breed}
                </p>
                <p className="text-[10px] text-stone-500 mt-1">
                  Archived on {bird.archive_date} • <span className="italic">{bird.archive_reason}</span>
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

    </div>
  );
}