import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import LoadingSpinner from './LoadingSpinner';
import FormInput from './FormInput';
import Sheet from './Sheet';
import { PrimaryButton, Section } from './ui';

/** Pantry stock strip with an Adjust sheet (shown on the Overview tab). */
export default function PantrySection() {
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

  useEffect(() => {
    const applyInventory = (data: { boxes_for_sale: number; boxes_personal: number; loose_eggs: number }) => {
      setBoxesForSale(data.boxes_for_sale);
      setBoxesPersonal(data.boxes_personal);
      setLooseEggs(data.loose_eggs);

      setEditForSale(data.boxes_for_sale);
      setEditPersonal(data.boxes_personal);
      setEditLoose(data.loose_eggs);
    };

    const fetchInventory = async () => {
      // 🛑 DEMO MODE — sample inventory only
      if (isDemo) {
        applyInventory(demoStore.getPantry());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('pantry_inventory')
          .select('*')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) applyInventory(data);
      } catch (error) {
        console.error('Error fetching pantry inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [isDemo]);

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // 🛑 DEMO MODE
    if (isDemo) {
      demoStore.setPantry({
        boxes_for_sale: Number(editForSale),
        boxes_personal: Number(editPersonal),
        loose_eggs: Number(editLoose)
      });
      setBoxesForSale(Number(editForSale));
      setBoxesPersonal(Number(editPersonal));
      setLooseEggs(Number(editLoose));
      setIsOpen(false);
      setSaving(false);
      return;
    }

    // 🟢 LIVE MODE
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


  if (loading) {
    return <LoadingSpinner message="Loading pantry…" size="sm" />;
  }

  const numericChange = (setter: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) setter(val === '' ? 0 : Number(val));
  };

  const cells = [
    { label: 'For sale', n: boxesForSale, unit: 'boxes' },
    { label: 'Personal', n: boxesPersonal, unit: 'boxes' },
    { label: 'Loose', n: looseEggs, unit: 'eggs' },
  ];

  return (
    <>
      <Section title="Pantry" action={{ label: 'Adjust', onClick: () => setIsOpen(true), underline: true }}>
        <div className="grid grid-cols-3 rounded-xl border border-line bg-surface">
          {cells.map((c, i) => (
            <div key={c.label} className={`flex flex-col gap-1 p-3.5 ${i ? 'border-l border-line' : ''}`}>
              <span className="text-[11px] text-muted">{c.label}</span>
              <span className="flex items-baseline gap-1">
                <span className="font-mono text-2xl font-medium tracking-[-.02em] tabular-nums">{c.n}</span>
                <span className="text-[11px] text-muted">{c.unit}</span>
              </span>
            </div>
          ))}
        </div>
        {potentialNewBoxes > 0 && (
          <p className="m-0 px-0.5 text-right text-xs text-muted">
            Enough loose to pack {potentialNewBoxes} box{potentialNewBoxes > 1 ? 'es' : ''}
            {remainingLoose > 0 ? `, ${remainingLoose} left over` : ''}
          </p>
        )}
      </Section>

      <Sheet open={isOpen} title="Adjust pantry" onClose={() => setIsOpen(false)}>
        <form onSubmit={handleSaveAdjustment} className="flex flex-col gap-4">
          <p className="m-0 text-[13px] text-pretty text-muted">
            Correct the counts for breakage, kitchen use or a stock check. Logs and sales update the pantry automatically.
            {isDemo && ' In demo mode this only changes the sandbox.'}
          </p>

          <div className="flex flex-col gap-3">
            <FormInput onPage label="Boxes for sale" type="text" inputMode="numeric" pattern="[0-9]*" value={editForSale} onChange={numericChange(setEditForSale)} className="font-mono" />
            <FormInput onPage label="Boxes for personal use" type="text" inputMode="numeric" pattern="[0-9]*" value={editPersonal} onChange={numericChange(setEditPersonal)} className="font-mono" />
            <FormInput onPage label="Loose eggs" type="text" inputMode="numeric" pattern="[0-9]*" value={editLoose} onChange={numericChange(setEditLoose)} className="font-mono" />
          </div>

          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save counts'}
          </PrimaryButton>
        </form>
      </Sheet>
    </>
  );
}
