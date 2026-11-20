import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { useRefresh } from '../context/RefreshContext';
import { demoStore } from '../demo/demoStore';
import DateSelector from '../components/DateSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import type { FlockMember } from '../types/types';
import PageContainer from '../components/PageContainer';
import { Card, Chevron, EmptyState, Field, PrimaryButton, Section, Segmented, Select, TextButton } from '../components/ui';
import { inputClass, rowDivider, textareaClass } from '../components/uiStyles';
import { todayLocal } from '../utils/format';
import { errorMessage } from '../utils/errors';

export default function FlockManager() {
  const getTodayString = todayLocal;
  const { isDemo, triggerDemoToast } = useDemo();
  const { refreshKey } = useRefresh();

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
      // 🛑 DEMO MODE — sample flock only
      if (isDemo) {
        setBreeds(demoStore.getBreeds());
        setFlock(demoStore.getFlock());
        setIsLoading(false);
        return;
      }

      // `isLoading` starts true and is only cleared, so refreshes keep the current list on screen.
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
  }, [isDemo, refreshKey]);

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
      demoStore.addBreed(cleanName);
      setBreeds(demoStore.getBreeds());
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
    } catch (err) {
      alert(`Error adding breed: ${errorMessage(err)}`);
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
      demoStore.setFlock(updatedFlock);
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
    } catch (err) {
      alert(`Save Failed: ${errorMessage(err)}`);
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
      demoStore.setFlock(updatedFlock);
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
    } catch (err) {
      alert(`Archive Failed: ${errorMessage(err)}`);
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

  const census = [
    { label: 'Active birds', n: activeBirds.length },
    { label: 'Hens', n: totalHens },
    { label: 'Roosters', n: totalRoosters },
  ];

  return (
    <PageContainer>
      <Section title="Census">
        <div className="grid grid-cols-3 rounded-xl border border-line bg-surface">
          {census.map((c, i) => (
            <div key={c.label} className={`flex flex-col gap-1 p-3.5 ${i ? 'border-l border-line' : ''}`}>
              <span className="text-[11px] text-muted">{c.label}</span>
              <span className="font-mono text-2xl font-medium tracking-[-.02em] tabular-nums">{c.n}</span>
            </div>
          ))}
        </div>

        {Object.keys(breedCounts).length > 0 && (
          <Card padded={false}>
            {Object.entries(breedCounts).map(([breedName, counts]) => (
              <div key={breedName} className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${rowDivider}`}>
                <span className="truncate text-[13px] font-medium">{breedName}</span>
                <span className="flex-none text-xs text-muted">
                  <span className="font-mono text-ink">{counts.Hen}</span> hen{counts.Hen === 1 ? '' : 's'} ·{' '}
                  <span className="font-mono text-ink">{counts.Rooster}</span> rooster{counts.Rooster === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section
        title={editingId ? 'Edit bird' : 'Add bird'}
        action={editingId ? { label: 'Cancel edit', onClick: resetForm } : undefined}
      >
        <div className="flex flex-col gap-[18px] rounded-[14px] border border-line bg-surface p-4">
          <Field
            label="Breed"
            right={
              <TextButton tone="ink" onClick={() => setShowAddBreed(!showAddBreed)}>
                {showAddBreed ? 'Cancel' : '+ New breed'}
              </TextButton>
            }
          >
            {!showAddBreed ? (
              <Select value={breed} onChange={(e) => setBreed(e.target.value)}>
                <option value="" disabled>Select breed</option>
                {breeds.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            ) : (
              <form onSubmit={handleAddBreed} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Breed name"
                  value={newBreedInput}
                  onChange={(e) => setNewBreedInput(e.target.value)}
                  className={`${inputClass} min-w-0 flex-1`}
                  autoFocus
                />
                <button
                  type="submit"
                  className="h-11 cursor-pointer rounded-lg bg-ink px-[18px] text-sm font-medium text-app active:bg-ink-pressed"
                >
                  Add
                </button>
              </form>
            )}
          </Field>

          <Segmented
            options={[{ value: 'Hen', label: 'Hen' }, { value: 'Rooster', label: 'Rooster' }]}
            value={sex}
            onChange={setSex}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Band / ring ID">
              <input type="text" placeholder="e.g. 124" value={bandNumber} onChange={(e) => setBandNumber(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Name">
              <input type="text" placeholder="Optional" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Birth year">
              <input type="number" inputMode="numeric" placeholder="YYYY" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Colour">
              <input type="text" placeholder="e.g. White spotted" value={color} onChange={(e) => setColor(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <DateSelector value={hatchDate} onChange={setHatchDate} label="Hatch / purchase date (optional)" />

          <Field label="Notes">
            <textarea rows={2} placeholder="Medical or background notes…" value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} />
          </Field>

          <PrimaryButton onClick={handleSaveBird}>{editingId ? 'Update bird' : 'Save to flock'}</PrimaryButton>
        </div>
      </Section>

      <Section title="Active birds" aside={`${activeBirds.length} total`}>
        <Card padded={false}>
          {activeBirds.length === 0 ? (
            <EmptyState>No birds logged yet.</EmptyState>
          ) : (
            activeBirds.map((bird) => (
              <details key={bird.id} className={`group ${rowDivider}`}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 select-none hover:bg-app [&::-webkit-details-marker]:hidden">
                  <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-subtle font-mono text-[11px] text-ink-soft">
                    {bird.sex === 'Hen' ? 'H' : 'R'}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{bird.name || bird.breed}</span>
                    <span className="truncate text-xs text-muted">
                      {[bird.name ? bird.breed : null, bird.birth_year || 'Unknown year', bird.band_number ? `Band ${bird.band_number}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <Chevron className="text-muted group-open:rotate-180" />
                </summary>

                <div className="flex flex-col gap-3 px-3.5 pb-3.5">
                  {(bird.color || bird.hatch_date) && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                      {bird.color && <span>Colour <span className="text-ink">{bird.color}</span></span>}
                      {bird.hatch_date && <span>Hatched <span className="font-mono text-ink">{bird.hatch_date}</span></span>}
                    </div>
                  )}
                  {bird.notes && <p className="m-0 text-xs text-ink-soft">{bird.notes}</p>}

                  {archivingId === bird.id ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-line bg-app p-3">
                      <span className="text-[13px] font-medium">Archive bird</span>
                      <DateSelector value={archiveDate} onChange={setArchiveDate} label="Archive date" />
                      <Field label="Reason">
                        <input
                          type="text"
                          placeholder="e.g. Sold, passed away"
                          value={archiveReason}
                          onChange={(e) => setArchiveReason(e.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <div className="flex justify-end gap-4">
                        <TextButton onClick={() => setArchivingId(null)}>Cancel</TextButton>
                        <TextButton tone="danger" onClick={handleArchiveBird}>Confirm archive</TextButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-4">
                      <TextButton onClick={() => handleEditClick(bird)}>Edit</TextButton>
                      <TextButton tone="danger" onClick={() => setArchivingId(bird.id)}>Archive</TextButton>
                    </div>
                  )}
                </div>
              </details>
            ))
          )}
        </Card>
      </Section>

      {archivedBirds.length > 0 && (
        <details className="group rounded-xl border border-line bg-surface">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-1.5 text-[13px] text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
            Archived birds ({archivedBirds.length})
            <Chevron className="group-open:rotate-180" />
          </summary>
          <div>
            {archivedBirds.map((bird) => (
              <div key={bird.id} className="flex flex-col gap-0.5 border-t border-divider px-3.5 py-3">
                <span className="text-sm font-medium text-ink-soft">{bird.name || bird.breed}</span>
                <span className="text-xs text-muted">
                  Archived <span className="font-mono">{bird.archive_date}</span>
                  {bird.archive_reason ? ` · ${bird.archive_reason}` : ''}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </PageContainer>
  );
}
